import { PrismaClient, Conversation, Message, PageSettings, User, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Legacy export for compatibility
export const db = prisma

// ===== User Functions =====
export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

// ===== Conversation Functions =====
export async function getConversations(pageId: string) {
  return prisma.conversation.findMany({
    where: { pageId },
    orderBy: { updatedTime: 'desc' },
    include: { messages: { orderBy: { createdTime: 'desc' }, take: 1 } }
  })
}

export async function getConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdTime: 'asc' } } }
  })
}

export async function getConversationByPageAndParticipant(pageId: string, participantId: string) {
  return prisma.conversation.findUnique({
    where: { pageId_participantId: { pageId, participantId } }
  })
}

export async function upsertConversation(data: {
  pageId: string
  participantId: string
  participantName?: string
  snippet?: string
  updatedTime?: Date
  unreadCount?: number
  adId?: string
  facebookLink?: string
  viewedBy?: string
  facebookConversationId?: string
}) {
  // First check if conversation exists and was viewed after last update
  const existing = await prisma.conversation.findUnique({
    where: { pageId_participantId: { pageId: data.pageId, participantId: data.participantId } },
    select: { lastViewedAt: true, updatedTime: true, unreadCount: true }
  });
  
  // Determine if we should update unreadCount:
  // - If lastViewedAt >= updatedTime (from data), user already read it, keep unreadCount = 0
  // - If new updatedTime > lastViewedAt, there's new messages, use Facebook's unread_count
  let finalUnreadCount = data.unreadCount ?? 0;
  
  if (existing?.lastViewedAt && data.updatedTime) {
    // User viewed after (or same time as) the conversation was last updated
    if (existing.lastViewedAt >= data.updatedTime) {
      finalUnreadCount = 0; // User already read, force to 0
    }
  } else if (existing?.lastViewedAt && !data.updatedTime) {
    // No new update time, keep existing unread count
    finalUnreadCount = existing.unreadCount ?? 0;
  }
  
  return prisma.conversation.upsert({
    where: { pageId_participantId: { pageId: data.pageId, participantId: data.participantId } },
    create: data,
    update: {
      participantName: data.participantName,
      snippet: data.snippet,
      updatedTime: data.updatedTime,
      unreadCount: finalUnreadCount,
      adId: data.adId,
      facebookLink: data.facebookLink,
      // Don't override viewedBy - preserve who read it
      facebookConversationId: data.facebookConversationId
    }
  })
}

export async function bulkUpsertConversations(conversations: Array<{
  pageId: string
  participantId: string
  participantName?: string
  snippet?: string
  updatedTime?: Date
  unreadCount?: number
  adId?: string
  facebookLink?: string
  facebookConversationId?: string
}>) {
  const results = await Promise.all(
    conversations.map(conv => upsertConversation(conv))
  )
  return results
}

export async function updateConversationUnreadCount(id: string, unreadCount: number) {
  return prisma.conversation.update({
    where: { id },
    data: { unreadCount }
  })
}

export async function markConversationAsViewed(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } })
  if (!conversation) return null
  
  const viewedBy = conversation.viewedBy ? JSON.parse(conversation.viewedBy) : []
  if (!viewedBy.includes(userId)) {
    viewedBy.push(userId)
  }
  
  return prisma.conversation.update({
    where: { id },
    data: { viewedBy: JSON.stringify(viewedBy), unreadCount: 0 }
  })
}

// ===== Message Functions =====
export async function getMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdTime: 'asc' }
  })
}

export async function createMessage(data: {
  conversationId: string
  from: string
  text?: string
  attachments?: string
  stickerUrl?: string
  isFromPage: boolean
  createdTime: Date
}) {
  return prisma.message.create({ data })
}

export async function bulkCreateMessages(messages: Array<{
  conversationId: string
  from: string
  text?: string
  attachments?: string
  stickerUrl?: string
  isFromPage: boolean
  createdTime: Date
}>) {
  return prisma.message.createMany({ data: messages, skipDuplicates: true })
}

export async function getLatestMessage(conversationId: string) {
  return prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdTime: 'desc' }
  })
}

// ===== PageSettings Functions =====
export async function getPageSettings(pageId: string) {
  return prisma.pageSettings.findUnique({ where: { pageId } })
}

export async function upsertPageSettings(data: {
  pageId: string
  pageName?: string
  pageAccessToken?: string
  rotationEnabled?: boolean
  rotationInterval?: number
  rotationUserIds?: string
  currentRotationIndex?: number
  lastRotationTime?: Date
  userId: string
}) {
  return prisma.pageSettings.upsert({
    where: { pageId: data.pageId },
    create: data,
    update: {
      pageName: data.pageName,
      pageAccessToken: data.pageAccessToken,
      rotationEnabled: data.rotationEnabled,
      rotationInterval: data.rotationInterval,
      rotationUserIds: data.rotationUserIds,
      currentRotationIndex: data.currentRotationIndex,
      lastRotationTime: data.lastRotationTime
    }
  })
}

export async function getAllPageSettings(userId: string) {
  return prisma.pageSettings.findMany({ where: { userId } })
}

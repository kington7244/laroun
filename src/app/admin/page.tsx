"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Image from "next/image"
import {
  Users, Activity, MessageSquare,
  Search, ChevronLeft, ChevronRight, LogOut,
  Shield, Crown, User, Trash2, RefreshCw,
  LayoutDashboard, Users2, ClipboardList,
} from "lucide-react"

type TabType = "overview" | "users" | "activities" | "teams"

interface Stats {
  totalUsers: number
  totalTeams: number
  totalConversations: number
  totalMessages: number
  todayActivity: number
}

interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
  updatedAt?: string
  facebookName?: string
  _count?: {
    ownedTeams: number
    teamMemberships: number
    assignedConversations: number
  }
}

interface ActivityData {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  action: string
  details: string | null
  createdAt: string
}

interface TeamData {
  id: string
  name: string
  owner: { id: string; name: string | null; email: string; image: string | null }
  members: Array<{
    id: string
    user: { id: string; name: string | null; email: string; image: string | null; role: string }
  }>
  _count: { members: number }
  createdAt: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  // Data states
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<UserData[]>([])
  const [usersByRole, setUsersByRole] = useState<Array<{ role: string; count: number }>>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])

  // Pagination & filters
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userSearch, setUserSearch] = useState("")
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotal, setActivityTotal] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === "overview") {
        const res = await fetch("/api/admin?type=overview")
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setRecentUsers(data.recentUsers)
          setUsersByRole(data.usersByRole)
          setAuthenticated(true)
        }
      } else if (activeTab === "users") {
        const res = await fetch(`/api/admin?type=users&page=${userPage}&limit=20&search=${userSearch}`)
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users)
          setUserTotal(data.pagination.total)
        }
      } else if (activeTab === "activities") {
        const res = await fetch(`/api/admin?type=activities&page=${activityPage}&limit=50`)
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities)
          setActivityTotal(data.pagination.total)
        }
      } else if (activeTab === "teams") {
        const res = await fetch("/api/admin?type=teams")
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setTeams(data.teams)
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    }
    setLoading(false)
  }, [activeTab, userPage, userSearch, activityPage, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin/login")
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeRole", userId, newRole }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to change role:", error)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone!`)) return

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteUser", userId }),
      })
      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "host":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <Crown className="w-3 h-3" /> Host
          </span>
        )
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <User className="w-3 h-3" /> Staff
          </span>
        )
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "🔑 Login",
      logout: "🚪 Logout",
      change_role: "👑 Change Role",
      delete_user: "🗑️ Delete User",
      send_message: "💬 Send Message",
      create_team: "👥 Create Team",
      add_member: "➕ Add Member",
    }
    return labels[action] || action
  }

  if (!authenticated && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users2 },
    { id: "activities", label: "Activity Log", icon: ClipboardList },
    { id: "teams", label: "Teams", icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Backend Management</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && stats && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        <p className="text-xs text-gray-500">Total Users</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
                        <p className="text-xs text-gray-500">Teams</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
                        <p className="text-xs text-gray-500">Conversations</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalMessages.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Messages</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Activity className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.todayActivity}</p>
                        <p className="text-xs text-gray-500">Today&apos;s Activity</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Users by Role & Recent Users */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
                    <div className="space-y-3">
                      {usersByRole.map((item) => (
                        <div key={item.role} className="flex items-center justify-between">
                          {getRoleBadge(item.role)}
                          <span className="text-xl font-bold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
                    <div className="space-y-3">
                      {recentUsers.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center gap-3">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt=""
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{user.name || "No name"}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {getRoleBadge(user.role)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        setUserPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={loadData}
                    className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                            User
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                            Role
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">
                            Stats
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">
                            Created
                          </th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {user.image ? (
                                  <Image
                                    src={user.image}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user.name || "No name"}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={user.role}
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="host">👑 Host</option>
                                <option value="admin">🛡️ Admin</option>
                                <option value="staff">👤 Staff</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Teams: {user._count?.ownedTeams || 0}</span>
                                <span>Chats: {user._count?.assignedConversations || 0}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                              {format(new Date(user.createdAt), "MMM d, yyyy")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {users.length} of {userTotal} users
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Page {userPage}</span>
                    <button
                      onClick={() => setUserPage((p) => p + 1)}
                      disabled={users.length < 20}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === "activities" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {activities.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No activity logs yet</div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{getActionLabel(activity.action)}</span>
                                <span className="text-xs text-gray-500">
                                  by {activity.userName || activity.userEmail}
                                </span>
                              </div>
                              {activity.details && (
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    try {
                                      const details = JSON.parse(activity.details)
                                      return Object.entries(details)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(", ")
                                    } catch {
                                      return activity.details
                                    }
                                  })()}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {format(new Date(activity.createdAt), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {activities.length} of {activityTotal} activities
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Page {activityPage}</span>
                    <button
                      onClick={() => setActivityPage((p) => p + 1)}
                      disabled={activities.length < 50}
                      className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Teams Tab */}
            {activeTab === "teams" && (
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    No teams created yet
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                            <p className="text-sm text-gray-500">
                              Owner: {team.owner.name || team.owner.email}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {team._count.members} members
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
                            >
                              {member.user.image ? (
                                <Image
                                  src={member.user.image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-gray-500" />
                                </div>
                              )}
                              <span className="text-sm text-gray-700">
                                {member.user.name || member.user.email}
                              </span>
                              {getRoleBadge(member.user.role)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

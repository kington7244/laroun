"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Camera, Trash2 } from "lucide-react"

const accountFormSchema = z.object({
    name: z
        .string()
        .min(2, {
            message: "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร",
        })
        .max(50, {
            message: "ชื่อต้องไม่เกิน 50 ตัวอักษร",
        }),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface UserProfile {
    id: string
    name: string | null
    email: string
    image: string | null
    facebookName: string | null
    role: string
}

export function AccountForm() {
    const { update: updateSession } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            name: "",
        },
    })

    // Load profile on mount
    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/account/profile")
            if (res.ok) {
                const data = await res.json()
                setProfile(data)
                form.reset({
                    name: data.name || "",
                })
            }
        } catch (error) {
            console.error("Failed to load profile:", error)
            toast.error("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้")
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: AccountFormValues) => {
        try {
            setSaving(true)
            const res = await fetch("/api/account/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: data.name }),
            })

            if (res.ok) {
                const result = await res.json()
                setProfile(prev => prev ? { ...prev, name: result.user.name } : null)
                // Update session to reflect new name across the app
                await updateSession({ name: result.user.name })
                toast.success("บันทึกชื่อเรียบร้อยแล้ว")
            } else {
                const error = await res.json()
                toast.error(error.error || "ไม่สามารถบันทึกได้")
            }
        } catch (error) {
            console.error("Failed to save profile:", error)
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setSaving(false)
        }
    }

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            toast.error("รองรับเฉพาะไฟล์ JPEG, PNG, GIF และ WebP เท่านั้น")
            return
        }

        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)")
            return
        }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/account/profile", {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const result = await res.json()
                setProfile(prev => prev ? { ...prev, image: result.imageUrl } : null)
                // Update session to reflect new image across the app
                await updateSession({ image: result.imageUrl })
                toast.success("อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว")
            } else {
                const error = await res.json()
                toast.error(error.error || "ไม่สามารถอัปโหลดได้")
            }
        } catch (error) {
            console.error("Failed to upload image:", error)
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setUploading(false)
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleRemoveImage = async () => {
        if (!confirm("ต้องการลบรูปโปรไฟล์?")) return

        try {
            setUploading(true)
            const res = await fetch("/api/account/profile", {
                method: "DELETE",
            })

            if (res.ok) {
                setProfile(prev => prev ? { ...prev, image: null } : null)
                // Update session to reflect removed image across the app
                await updateSession({ image: null })
                toast.success("ลบรูปโปรไฟล์เรียบร้อยแล้ว")
            } else {
                toast.error("ไม่สามารถลบรูปได้")
            }
        } catch (error) {
            console.error("Failed to remove image:", error)
            toast.error("เกิดข้อผิดพลาด")
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const displayName = profile?.name || profile?.facebookName || profile?.email || "User"
    const initial = displayName.charAt(0).toUpperCase()

    return (
        <div className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24 cursor-pointer border-2 border-muted" onClick={handleImageClick}>
                        <AvatarImage src={profile?.image || undefined} alt={displayName} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {initial}
                        </AvatarFallback>
                    </Avatar>
                    
                    {/* Overlay on hover */}
                    <div 
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleImageClick}
                    >
                        {uploading ? (
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                            <Camera className="h-6 w-6 text-white" />
                        )}
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                <div className="text-center sm:text-left">
                    <h3 className="text-lg font-medium">{displayName}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleImageClick}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Camera className="h-4 w-4 mr-2" />
                            )}
                            เปลี่ยนรูป
                        </Button>
                        {profile?.image && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveImage}
                                disabled={uploading}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                ลบรูป
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        รองรับ JPEG, PNG, GIF, WebP (สูงสุด 5MB)
                    </p>
                </div>
            </div>

            {/* Name Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>ชื่อแสดงในระบบ</FormLabel>
                                <FormControl>
                                    <Input placeholder="ใส่ชื่อของคุณ" {...field} />
                                </FormControl>
                                <FormDescription>
                                    ชื่อนี้จะแสดงในระบบและในอีเมลที่ส่งถึงคุณ
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">อีเมล</label>
                        <Input value={profile?.email || ""} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">
                            อีเมลไม่สามารถเปลี่ยนแปลงได้
                        </p>
                    </div>

                    {/* Role (read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">บทบาท</label>
                        <Input 
                            value={
                                profile?.role === 'host' ? 'Host (เจ้าของระบบ)' :
                                profile?.role === 'admin' ? 'Admin (ผู้ดูแล)' :
                                'Staff (พนักงาน)'
                            } 
                            disabled 
                            className="bg-muted" 
                        />
                    </div>

                    {/* Facebook Name (if connected) */}
                    {profile?.facebookName && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อ Facebook</label>
                            <Input value={profile.facebookName} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">
                                ชื่อจาก Facebook ที่เชื่อมต่อ
                            </p>
                        </div>
                    )}

                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            "บันทึกการเปลี่ยนแปลง"
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    )
}

"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { LogoStatic } from "@/components/Logo"

export default function PrivacyPolicyPage() {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/">
                        <LogoStatic size="md" />
                    </Link>
                    <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                        {language === "th" ? "เข้าสู่ระบบ" : "Sign In"}
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    {language === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
                </h1>

                <div className="prose prose-gray max-w-none">
                    <p className="text-gray-600 mb-6">
                        {language === "th" 
                            ? "อัปเดตล่าสุด: 4 ธันวาคม 2568"
                            : "Last updated: December 4, 2025"}
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "1. บทนำ" : "1. Introduction"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "Laroun (\"เรา\", \"ของเรา\") ให้ความสำคัญกับความเป็นส่วนตัวของคุณ นโยบายความเป็นส่วนตัวนี้อธิบายวิธีที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณเมื่อคุณใช้บริการของเรา"
                                : "Laroun (\"we\", \"our\", \"us\") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "2. ข้อมูลที่เราเก็บรวบรวม" : "2. Information We Collect"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "เราอาจเก็บรวบรวมข้อมูลต่อไปนี้:" : "We may collect the following information:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ข้อมูลบัญชี (ชื่อ อีเมล รหัสผ่านที่เข้ารหัส)" : "Account information (name, email, encrypted password)"}</li>
                            <li>{language === "th" ? "ข้อมูลการเชื่อมต่อ Facebook Ads" : "Facebook Ads connection data"}</li>
                            <li>{language === "th" ? "ข้อมูลการใช้งานและการวิเคราะห์" : "Usage data and analytics"}</li>
                            <li>{language === "th" ? "ข้อมูลอุปกรณ์และเบราว์เซอร์" : "Device and browser information"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "3. วิธีที่เราใช้ข้อมูลของคุณ" : "3. How We Use Your Information"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "เราใช้ข้อมูลของคุณเพื่อ:" : "We use your information to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ให้บริการและปรับปรุงแพลตฟอร์มของเรา" : "Provide and improve our platform"}</li>
                            <li>{language === "th" ? "จัดการบัญชีและการตรวจสอบสิทธิ์ของคุณ" : "Manage your account and authentication"}</li>
                            <li>{language === "th" ? "สื่อสารกับคุณเกี่ยวกับบริการของเรา" : "Communicate with you about our services"}</li>
                            <li>{language === "th" ? "วิเคราะห์การใช้งานเพื่อปรับปรุงประสบการณ์ผู้ใช้" : "Analyze usage to improve user experience"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "4. การแบ่งปันข้อมูล" : "4. Information Sharing"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราอาจแบ่งปันข้อมูลกับ:"
                                : "We do not sell your personal information. We may share information with:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "ผู้ให้บริการที่ช่วยเราดำเนินงานแพลตฟอร์ม" : "Service providers who help us operate the platform"}</li>
                            <li>{language === "th" ? "Facebook/Meta เพื่อการเชื่อมต่อ API" : "Facebook/Meta for API integration"}</li>
                            <li>{language === "th" ? "หน่วยงานกำกับดูแลเมื่อกฎหมายกำหนด" : "Legal authorities when required by law"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "5. ความปลอดภัยของข้อมูล" : "5. Data Security"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ รวมถึงการเข้ารหัส การควบคุมการเข้าถึง และการตรวจสอบความปลอดภัยเป็นประจำ"
                                : "We implement appropriate security measures to protect your data, including encryption, access controls, and regular security audits."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "6. สิทธิ์ของคุณ" : "6. Your Rights"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" ? "คุณมีสิทธิ์ในการ:" : "You have the right to:"}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>{language === "th" ? "เข้าถึงข้อมูลส่วนบุคคลของคุณ" : "Access your personal data"}</li>
                            <li>{language === "th" ? "แก้ไขข้อมูลที่ไม่ถูกต้อง" : "Correct inaccurate data"}</li>
                            <li>{language === "th" ? "ขอให้ลบข้อมูลของคุณ" : "Request deletion of your data"}</li>
                            <li>{language === "th" ? "ถอนความยินยอมได้ตลอดเวลา" : "Withdraw consent at any time"}</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "7. คุกกี้" : "7. Cookies"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์ของคุณ คุณสามารถจัดการการตั้งค่าคุกกี้ในเบราว์เซอร์ของคุณได้"
                                : "We use cookies to improve your experience. You can manage cookie settings in your browser."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "8. การเปลี่ยนแปลงนโยบาย" : "8. Policy Changes"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "เราอาจอัปเดตนโยบายนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบถึงการเปลี่ยนแปลงที่สำคัญผ่านทางอีเมลหรือประกาศบนเว็บไซต์ของเรา"
                                : "We may update this policy periodically. We will notify you of significant changes via email or a notice on our website."}
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {language === "th" ? "9. ติดต่อเรา" : "9. Contact Us"}
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {language === "th" 
                                ? "หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ กรุณาติดต่อเราที่:"
                                : "If you have questions about this Privacy Policy, please contact us at:"}
                        </p>
                        <p className="text-gray-700">
                            Email: <a href="mailto:privacy@laroun.com" className="text-blue-600 hover:underline">privacy@laroun.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t">
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← {language === "th" ? "กลับหน้าหลัก" : "Back to Home"}
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t py-6">
                <div className="container mx-auto px-6 text-center text-sm text-gray-500">
                    © 2024 Laroun. {language === "th" ? "สงวนลิขสิทธิ์." : "All rights reserved."}
                </div>
            </footer>
        </div>
    )
}

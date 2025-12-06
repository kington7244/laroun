'use client'

export default function AdBoxPage() {
    return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl shadow-2xl border border-gray-200">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
                <p className="text-red-500 text-lg">You don't have permission to access this page.</p>
            </div>
        </div>
    );
}

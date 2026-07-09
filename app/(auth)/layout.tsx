export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-brand-600">KantongKu</span>
          <p className="mt-1 text-sm text-gray-500">
            Pembukuan UMKM sesuai standar SAK EMKM
          </p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}

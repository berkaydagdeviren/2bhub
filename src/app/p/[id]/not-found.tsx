export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl font-light text-[#B5AFA6] mb-4">404</p>
      <p className="text-lg font-semibold text-[#1A1A1A]">Ürün bulunamadı</p>
      <p className="text-sm text-[#7A7468] mt-1">
        Bu ürün mevcut değil veya kaldırılmış olabilir.
      </p>
      <p className="text-xs text-[#B5AFA6] mt-8">2B Hub</p>
    </div>
  );
}

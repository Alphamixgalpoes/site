export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Petrus Imóveis
        </h1>
        <p className="text-lg text-gray-500">
          Especialistas em galpões industriais na região de Alphaville e Barueri.
        </p>
        <a
          href="https://wa.me/5511999999999"
          className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Fale pelo WhatsApp
        </a>
      </div>
    </main>
  );
}

/** Home pública — catálogo de productos disponibles con carrito. */
import { Link } from "react-router-dom";
import { ShoppingCart, Loader, CreditCard, Truck, Store } from "lucide-react";
import { useCategoriasTree } from "../hooks/useCategorias";
import { useCartStore } from "../store/cartStore";
import CategoryCarousel from "../components/CategoryCarousel";

export default function HomePage() {
  const { data: categoriasTree, isLoading: categoriasLoading } = useCategoriasTree("activo");
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="bg-gradient-to-r from-green-main to-green-dark rounded-2xl py-6 px-8 md:py-10 md:px-12 text-center text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 tracking-tight">
            Tus productos favoritos, <br className="hidden md:inline" />
            <span className="text-yellow-banner">a un clic de distancia</span>
          </h1>
          <p className="text-sm md:text-base text-white/90 mb-4 max-w-xl mx-auto">
            Descubrí nuestro catálogo completo de productos frescos y de alta calidad.
          </p>
          {itemCount > 0 && (
            <Link
              to="/carrito"
              className="inline-flex items-center gap-2 bg-yellow-banner text-green-dark font-bold px-6 py-2.5 rounded-full hover:scale-105 transition-transform shadow-md text-sm"
            >
              <ShoppingCart size={16} />
              Ver carrito ({itemCount} {itemCount === 1 ? "producto" : "productos"})
            </Link>
          )}
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </section>

      {/* Info de Servicios (Pagos, Envíos, Takeaway) */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm py-3 px-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 md:divide-x divide-gray-100/80">
        {/* Métodos de Pago */}
        <div className="flex items-center gap-3 px-2 md:px-4">
          <div className="p-2 bg-green-50 rounded-xl text-green-main flex-shrink-0">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Pagos Flexibles</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">MercadoPago, Efectivo o Transferencia</p>
          </div>
        </div>

        {/* Envío a domicilio */}
        <div className="flex items-center gap-3 px-2 md:px-4">
          <div className="p-2 bg-green-50 rounded-xl text-green-main flex-shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Delivery Express</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Recibí tu comida bien caliente en casa</p>
          </div>
        </div>

        {/* Takeaway / Retiro */}
        <div className="flex items-center gap-3 px-2 md:px-4">
          <div className="p-2 bg-green-50 rounded-xl text-green-main flex-shrink-0">
            <Store size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Retiro en Local</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Pedí online y retirá sin fila (Takeaway)</p>
          </div>
        </div>
      </section>

      {/* Catálogo de Productos agrupados por Categoría Padre */}
      <section className="space-y-6">

        {categoriasLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex gap-4 overflow-hidden opacity-50">
                  <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
                  <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
                  <div className="w-64 h-80 bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !categoriasTree || categoriasTree.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-500 shadow-sm">
            No hay categorías de productos disponibles en este momento.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-gray-100/30">
            {categoriasTree.map((cat, index) => (
              <div key={cat.id} className={index > 0 ? "pt-4" : ""}>
                <CategoryCarousel
                  categoriaId={cat.id}
                  titulo={cat.nombre}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


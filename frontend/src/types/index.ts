/** Interfaces globales del sistema Food Store. */

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  password: string;
  direccion: {
    alias?: string;
    linea1: string;
    linea2?: string;
    ciudad: string;
    provincia?: string;
    codigo_postal?: string;
  };
}

export interface AuthResponse {
  expires_in: number;
  user: UserResponse;
}

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_alergeno: boolean;
  es_producto_terminado: boolean;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida_id: number | null;
  unidad_medida: UnidadMedidaSimple | null;
  created_at: string;
  updated_at: string;
  active_at: string | null;
  deleted_at: string | null;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion: string | null;
  es_alergeno: boolean;
  es_producto_terminado: boolean;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida_id: number | null;
  activo?: boolean;
}

export interface IngredienteUpdate {
  nombre?: string;
  descripcion?: string | null;
  es_alergeno?: boolean;
  es_producto_terminado?: boolean;
  precio_costo?: number;
  stock_actual?: number;
  stock_minimo?: number;
  unidad_medida_id?: number | null;
  activo?: boolean;
  actualizar_precios_productos?: boolean;
  productos_a_actualizar?: number[];
}

export interface ProductoAfectadoResponse {
  id: number;
  nombre: string;
  precio_base_actual: number;
  margen_ganancia: number;
  cantidad_ingrediente: number;
  unidad_ingrediente: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface BaseFilters {
  page: number;
  per_page: number;
  search: string;
  estado: string;            // "activo" | "inactivo" | "todos"
  sort_by: string;
  sort_order: string;        // "asc" | "desc"
  created_from: string;      // "YYYY-MM-DD" | ""
  created_to: string;        // "YYYY-MM-DD" | ""
  updated_from: string;      // "YYYY-MM-DD" | ""
  updated_to: string;        // "YYYY-MM-DD" | ""
  starts_with: string;       // single letter | ""
}

export interface IngredientesFilters extends BaseFilters {
  es_alergeno: string;      // "true" | "false" | ""
  es_producto_terminado: string; // "true" | "false" | ""
}

// --- CATEGORIAS ---
export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  padre_id: number | null;
  imagen_url?: string | null;
  created_at: string;
  updated_at: string;
  active_at: string | null;
  deleted_at: string | null;
}

export interface CategoriaTree extends Categoria {
  subcategorias: CategoriaTree[];
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string | null;
  padre_id?: number | null;
  imagen_url?: string | null;
}

export interface CategoriaUpdate {
  nombre?: string;
  descripcion?: string | null;
  padre_id?: number | null;
  imagen_url?: string | null;
  activo?: boolean;
}

// --- UNIDADES DE MEDIDA ---
export interface UnidadMedidaSimple {
  id: number;
  nombre: string;
  simbolo: string;
  tipo: string;
  factor_conversion: number;
}

// --- PRODUCTOS ---
export interface ProductoCategoriaDetail {
  categoria: { id: number; nombre: string };
  es_principal: boolean;
}

export interface ProductoIngredienteDetail {
  ingrediente: { id: number; nombre: string; es_alergeno: boolean };
  cantidad: number;
  unidad_medida: UnidadMedidaSimple | null;
  es_removible: boolean;
}

export interface ProductoCategoriaCreate {
  categoria_id: number;
  es_principal: boolean;
}

export interface ProductoIngredienteCreate {
  ingrediente_id: number;
  cantidad: number;
  unidad_medida_id: number;
  es_removible: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  imagenes: string[];
  precio_base: number;
  costo_total: number;
  stock_cantidad: number;
  stock_disponible: number;
  margen_ganancia: number;
  precio_sugerido: number;
  disponible: boolean;
  categorias: ProductoCategoriaDetail[];
  ingredientes: ProductoIngredienteDetail[];
  unidad_venta: UnidadMedidaSimple | null;
  created_at: string;
  updated_at: string;
  active_at: string | null;
}

export interface ProductoCreate {
  nombre: string;
  descripcion: string | null;
  imagen_url?: string | null;
  imagenes?: string[];
  precio_base: number;
  stock_cantidad: number;
  margen_ganancia: number;
  disponible: boolean;
  activo?: boolean;
  unidad_venta_id?: number | null;
  categorias: ProductoCategoriaCreate[];
  ingredientes: ProductoIngredienteCreate[];
}

export interface ProductoUpdate extends Partial<Omit<ProductoCreate, 'categorias' | 'ingredientes'>> {
  activo?: boolean;
  imagen_url?: string | null;
  imagenes?: string[];
  categorias?: ProductoCategoriaCreate[];
  ingredientes?: ProductoIngredienteCreate[];
}

export interface ProductosFilters extends BaseFilters {
  categoria?: number;
  disponible?: string; // "true" | "false" | ""
}

export interface CategoriasFilters extends BaseFilters { }

// --- AUTH ---
export interface UserResponse {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
}

// --- PEDIDOS ---
export interface EstadoPedido {
  codigo: string;
  descripcion: string;
  orden: number;
  es_terminal: boolean;
}

export interface FormaPago {
  codigo: string;
  descripcion: string;
  habilitado: boolean;
}

export interface ItemPedidoRequest {
  producto_id: number;
  cantidad: number;
  personalizacion?: number[];
}

export interface PedidoCreate {
  items: ItemPedidoRequest[];
  forma_pago_codigo: string;
  direccion_id?: number | null;
  notas?: string;
}

export interface AvanzarEstadoRequest {
  estado_hacia: string;
  motivo?: string;
}

export interface DetallePedido {
  producto_id: number;
  cantidad: number;
  nombre_snapshot: string;
  precio_snapshot: number;
  subtotal_snap: number;
  personalizacion: number[] | null;
  created_at: string;
}

export interface HistorialEstado {
  id: number;
  pedido_id: number;
  estado_desde: string | null;
  estado_hacia: string;
  usuario_id: number | null;
  motivo: string | null;
  created_at: string;
}

export interface PedidoResponse {
  id: number;
  usuario_id: number;
  direccion_id: number | null;
  estado_codigo: string;
  forma_pago_codigo: string;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoDetail extends PedidoResponse {
  detalles: DetallePedido[];
  historial: HistorialEstado[];
  estado: EstadoPedido | null;
  forma_pago: FormaPago | null;
}

export interface PaginatedPedidos {
  items: PedidoResponse[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ------------------------------------------------------------------
// DIRECCIONES
// ------------------------------------------------------------------

export interface DireccionCreate {
  alias?: string;
  linea1: string;
  linea2?: string;
  ciudad: string;
  provincia?: string;
  codigo_postal?: string;
  es_principal?: boolean;
}

export interface DireccionResponse {
  id: number;
  usuario_id: number;
  alias: string;
  linea1: string;
  linea2: string | null;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  es_principal: boolean;
}

export interface PedidosFilters {
  page: number;
  per_page: number;
  estado?: string;
  id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  forma_pago?: string;
}

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  roles: string[];
  created_at: string;
  deleted_at: string | null;
}

export interface UsuarioUpdate {
  nombre?: string;
  apellido?: string;
  celular?: string;
}

export interface UsuarioRolesUpdate {
  roles: string[];
}

export interface Rol {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface PaginatedUsuarios {
  items: UsuarioAdmin[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// --- CARRITO ---
export interface CartItem {
  cartItemId: string; // Unique ID composed of producto.id + personalizacion
  producto: Producto;
  cantidad: number;
  personalizacion?: number[]; // IDs of removed ingredients
}


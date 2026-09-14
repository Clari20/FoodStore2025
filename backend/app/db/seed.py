"""
Script de seed - carga roles, usuarios e ingredientes iniciales para pruebas.
Idempotente: se puede ejecutar multiples veces sin duplicar datos.

Uso:
    python -m app.db.seed

Requiere PostgreSQL corriendo con las variables de .env configuradas.

Crea:
  - Catalogo de roles: ADMIN, CAJERO, COCINA_STOCK, CLIENT
  - Administrador (rol=ADMIN)
  - 10 ingredientes basicos
  - 7 unidades de medida
  - 7 estados de pedido
  - 2 formas de pago
"""

from decimal import Decimal
from sqlmodel import Session, select
from app.core.database import engine, create_all_tables
from app.core.security import hash_password
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.rol_model import Rol, UsuarioRol
from app.modules.ingredientes.model import Ingrediente
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente, UnidadMedida
from app.modules.categorias.model import Categoria
from app.modules.pedidos.model import EstadoPedido, FormaPago


ROLES_INICIALES = [
    {"codigo": "ADMIN", "nombre": "Administrador", "descripcion": "Acceso total sin restricciones"},
    {"codigo": "CAJERO", "nombre": "Cajero", "descripcion": "Confirma pedidos y gestiona entrega o envio"},
    {"codigo": "COCINA_STOCK", "nombre": "Cocina / Stock", "descripcion": "Prepara pedidos y gestiona productos, ingredientes y stock"},
    {"codigo": "CLIENT", "nombre": "Cliente", "descripcion": "Opera solo sus propios datos"},
]

USUARIOS_INICIALES = [
    {
        "nombre": "Administrador",
        "apellido": "FoodStore",
        "email": "admin@foodstore.com",
        "password": "admin",
        "roles": ["ADMIN"],
    },
    {
        "nombre": "Cajero",
        "apellido": "Foodstore",
        "email": "cajero@foodstore.com",
        "password": "cajero",
        "roles": ["CAJERO"],
    },
    {
        "nombre": "Cocina",
        "apellido": "Foodstore",
        "email": "cocina@foodstore.com",
        "password": "cocina",
        "roles": ["COCINA_STOCK"],
    },
]



UNIDADES_MEDIDA_INICIALES = [
    {"nombre": "kilogramo", "simbolo": "kg", "tipo": "masa", "factor_conversion": 1000.0},
    {"nombre": "gramo", "simbolo": "g", "tipo": "masa", "factor_conversion": 1.0},
    {"nombre": "litro", "simbolo": "L", "tipo": "volumen", "factor_conversion": 1000.0},
    {"nombre": "mililitro", "simbolo": "mL", "tipo": "volumen", "factor_conversion": 1.0},
    {"nombre": "pieza", "simbolo": "u", "tipo": "unidad", "factor_conversion": 1.0},
    {"nombre": "docena", "simbolo": "doc", "tipo": "unidad", "factor_conversion": 12.0},
    {"nombre": "metro cuadrado", "simbolo": "m2", "tipo": "area", "factor_conversion": 1.0},
]

ESTADOS_PEDIDO_INICIALES = [
    {"codigo": "PENDIENTE",   "descripcion": "Pedido recibido, esperando confirmacion", "orden": 1, "es_terminal": False},
    {"codigo": "CONFIRMADO",  "descripcion": "Pago confirmado, listo para preparar",    "orden": 2, "es_terminal": False},
    {"codigo": "EN_PREP",     "descripcion": "En preparacion en cocina",                "orden": 3, "es_terminal": False},
    {"codigo": "LISTO",       "descripcion": "Listo para entrega o envio",              "orden": 4, "es_terminal": False},
    {"codigo": "EN_CAMINO",   "descripcion": "En camino al cliente",                    "orden": 5, "es_terminal": False},
    {"codigo": "ENTREGADO",   "descripcion": "Entregado al cliente",                    "orden": 6, "es_terminal": True},
    {"codigo": "CANCELADO",   "descripcion": "Pedido cancelado",                        "orden": 7, "es_terminal": True},
]

FORMAS_PAGO_INICIALES = [
    {"codigo": "EFECTIVO",      "descripcion": "Efectivo al retirar en local", "habilitado": True},
    {"codigo": "TRANSFERENCIA", "descripcion": "Transferencia bancaria",       "habilitado": True},
    {"codigo": "MERCADOPAGO",   "descripcion": "Mercado Pago",                 "habilitado": True},
]


CATEGORIAS_INICIALES = [
    {"nombre": "Comidas", "descripcion": "Productos elaborados", "padre": None},
    {"nombre": "Pizzas", "descripcion": "Pizzas clasicas y especiales", "padre": "Comidas"},
    {"nombre": "Hamburguesas", "descripcion": "Hamburguesas del local", "padre": "Comidas"},
    {"nombre": "Acompañamientos", "descripcion": "Guarniciones y frituras", "padre": "Comidas"},
    {"nombre": "Panchos", "descripcion": "Panchos y completos", "padre": "Comidas"},
    {"nombre": "Empanadas", "descripcion": "Empanadas clasicas y especiales", "padre": "Comidas"},
    {"nombre": "Postres", "descripcion": "Postres listos para servir", "padre": None},
    {"nombre": "Bebidas", "descripcion": "Bebidas frias", "padre": None},
    {"nombre": "Gaseosas", "descripcion": "Gaseosas y aguas", "padre": "Bebidas"},
    {"nombre": "Tintos", "descripcion": "Vinos tintos", "padre": "Bebidas"},
    {"nombre": "Sandwiches", "descripcion": "Sandwiches y tostados del local", "padre": None},
    {"nombre": "Tostados", "descripcion": "Tostados clasicos y especiales", "padre": "Sandwiches"},
]

INGREDIENTES_INICIALES = [
    {"nombre": "Orégano", "descripcion": "Orégano seco", "es_alergeno": False, "unidad": "gramo", "stock": 200.0, "precio": 20.0},
    {"nombre": "Papitas pay", "descripcion": "", "es_alergeno": False, "unidad": "kilogramo", "stock": 11.6, "precio": 2000.0},
    {"nombre": "Harina 0000", "descripcion": "Harina refinada", "es_alergeno": True, "unidad": "kilogramo", "stock": 9.7, "precio": 800.0},
    {"nombre": "Levadura Fresca", "descripcion": "Levadura", "es_alergeno": False, "unidad": "gramo", "stock": 485.0, "precio": 10.0},
    {"nombre": "Morrón", "descripcion": "Morrón lata", "es_alergeno": False, "unidad": "kilogramo", "stock": 2.0, "precio": 10000.0},
    {"nombre": "papas al horno", "descripcion": "", "es_alergeno": False, "unidad": "kilogramo", "stock": 4.7, "precio": 500.0},
    {"nombre": "Pepperoni", "descripcion": "Pepperoni", "es_alergeno": False, "unidad": "kilogramo", "stock": 3.0, "precio": 12000.0},
    {"nombre": "Oregano", "descripcion": "Oregano seco", "es_alergeno": False, "unidad": "gramo", "stock": 198.0, "precio": 20.0},
    {"nombre": "Pan de Hamburguesa", "descripcion": "Pan individual para hamburguesa", "es_alergeno": True, "unidad": "pieza", "stock": 35.0, "precio": 350.0},
    {"nombre": "Agua Filtrada", "descripcion": "Agua purificada", "es_alergeno": False, "unidad": "litro", "stock": 100.0, "precio": 0.0},
    {"nombre": "Aceite de Oliva", "descripcion": "Aceite virgen extra", "es_alergeno": False, "unidad": "litro", "stock": 5.0, "precio": 4500.0},
    {"nombre": "Medallon de Carne", "descripcion": "Medallon vacuno para hamburguesa", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 900.0},
    {"nombre": "Queso roquefort", "descripcion": "", "es_alergeno": True, "unidad": "kilogramo", "stock": 4.5, "precio": 16000.0},
    {"nombre": "Queso Mozzarella", "descripcion": "Queso para pizza", "es_alergeno": True, "unidad": "kilogramo", "stock": 9.57, "precio": 6000.0},
    {"nombre": "Albahaca Fresca", "descripcion": "Hojas frescas", "es_alergeno": False, "unidad": "gramo", "stock": 100.0, "precio": 50.0},
    {"nombre": "Tomate Triturado", "descripcion": "Salsa base", "es_alergeno": False, "unidad": "litro", "stock": 9.65, "precio": 1200.0},
    {"nombre": "Huevo", "descripcion": "Huevo fresco", "es_alergeno": True, "unidad": "pieza", "stock": 60.0, "precio": 180.0},
    {"nombre": "Harina 000", "descripcion": "Harina de fuerza", "es_alergeno": True, "unidad": "kilogramo", "stock": 5.0, "precio": 750.0},
    {"nombre": "Pan de miga", "descripcion": "", "es_alergeno": True, "unidad": "pieza", "stock": 30.0, "precio": 200.0},
    {"nombre": "Sal Fina", "descripcion": "Sal común", "es_alergeno": False, "unidad": "gramo", "stock": 1000.0, "precio": 5.0},
    {"nombre": "Jamon cocido", "descripcion": "", "es_alergeno": False, "unidad": "kilogramo", "stock": 5.0, "precio": 15000.0},
    {"nombre": "Papa", "descripcion": "Papa para fritura", "es_alergeno": False, "unidad": "kilogramo", "stock": 8.0, "precio": 1800.0},
    {"nombre": "Leche", "descripcion": "Leche entera", "es_alergeno": True, "unidad": "litro", "stock": 12.0, "precio": 1100.0},
    {"nombre": "Azucar", "descripcion": "Azucar comun", "es_alergeno": False, "unidad": "kilogramo", "stock": 5.0, "precio": 1500.0},
    {"nombre": "Tapita de empanada", "descripcion": "Tapita de empanada criolla", "es_alergeno": True, "unidad": "pieza", "stock": 120.0, "precio": 150.0},
    {"nombre": "Picadillo", "descripcion": "Picadillo de carne molida", "es_alergeno": False, "unidad": "kilogramo", "stock": 10.0, "precio": 10000.0},
    {"nombre": "Jamón crudo", "descripcion": "Jamón crudo", "es_alergeno": False, "unidad": "kilogramo", "stock": 3.0, "precio": 20000.0},
    {"nombre": "Ananá", "descripcion": "Ananá en lata", "es_alergeno": False, "unidad": "kilogramo", "stock": 5.0, "precio": 5800.0},
    {"nombre": "Pan de pancho", "descripcion": "", "es_alergeno": True, "unidad": "pieza", "stock": 20.0, "precio": 500.0},
    {"nombre": "Salchica", "descripcion": "", "es_alergeno": False, "unidad": "pieza", "stock": 44.0, "precio": 250.0},
    {"nombre": "Queso chedar", "descripcion": "", "es_alergeno": True, "unidad": "kilogramo", "stock": 9.6, "precio": 9000.0},
    {"nombre": "Mayonesa", "descripcion": "", "es_alergeno": False, "unidad": "gramo", "stock": 1980.0, "precio": 20.0},
    {"nombre": "Mostaza", "descripcion": "", "es_alergeno": False, "unidad": "gramo", "stock": 3460.0, "precio": 20.0},
    {"nombre": "Rucula", "descripcion": "Rucula atadito", "es_alergeno": False, "unidad": "pieza", "stock": 12.0, "precio": 1000.0},
    {"nombre": "Queso en fetas", "descripcion": "Queso en fetas para tostados", "es_alergeno": True, "unidad": "kilogramo", "stock": 5.0, "precio": 8000.0},
    {"nombre": "Pechuga de pollo", "descripcion": "Pechuga de pollo para sandwich", "es_alergeno": False, "unidad": "kilogramo", "stock": 4.0, "precio": 5000.0},
    {"nombre": "Lechuga", "descripcion": "Lechuga fresca", "es_alergeno": False, "unidad": "pieza", "stock": 10.0, "precio": 800.0},
    {"nombre": "Tomate fresco", "descripcion": "Tomate fresco en rodajas", "es_alergeno": False, "unidad": "kilogramo", "stock": 3.0, "precio": 1500.0},
    {"nombre": "Uva Malbec", "descripcion": "Uva Malbec para vino", "es_alergeno": False, "unidad": "litro", "stock": 50.0, "precio": 3000.0},
    {"nombre": "Naranja", "descripcion": "Naranja para jugo", "es_alergeno": False, "unidad": "kilogramo", "stock": 10.0, "precio": 1200.0},
    {"nombre": "Agua con gas", "descripcion": "Agua mineral con gas 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 900.0, "es_producto_terminado": True},
    {"nombre": "Crema", "descripcion": "Crema de leche", "es_alergeno": True, "unidad": "litro", "stock": 3.0, "precio": 2500.0},
    {"nombre": "Cacao en polvo", "descripcion": "Cacao amargo en polvo", "es_alergeno": False, "unidad": "gramo", "stock": 500.0, "precio": 80.0},
    {"nombre": "Esencia de vainilla", "descripcion": "Esencia de vainilla líquida", "es_alergeno": False, "unidad": "mililitro", "stock": 200.0, "precio": 15.0},
    {"nombre": "Dulce de leche", "descripcion": "Dulce de leche repostero", "es_alergeno": True, "unidad": "kilogramo", "stock": 3.0, "precio": 4000.0},
    {"nombre": "Galletita", "descripcion": "Galletita molida para base de cheesecake", "es_alergeno": True, "unidad": "gramo", "stock": 500.0, "precio": 30.0},
    {"nombre": "Queso crema", "descripcion": "Queso crema para cheesecake", "es_alergeno": True, "unidad": "kilogramo", "stock": 2.0, "precio": 5000.0},
    {"nombre": "Frutos rojos", "descripcion": "Mix de frutos rojos para coulis", "es_alergeno": False, "unidad": "kilogramo", "stock": 2.0, "precio": 6000.0},
    {"nombre": "Arroz", "descripcion": "Arroz para postre", "es_alergeno": False, "unidad": "kilogramo", "stock": 3.0, "precio": 600.0},
    {"nombre": "Nueces", "descripcion": "Nueces para brownie", "es_alergeno": True, "unidad": "gramo", "stock": 300.0, "precio": 100.0},
    {"nombre": "Manteca", "descripcion": "Manteca para repostería", "es_alergeno": True, "unidad": "kilogramo", "stock": 2.0, "precio": 3500.0},
    {"nombre": "Cafe", "descripcion": "Café fuerte para tiramisú", "es_alergeno": False, "unidad": "mililitro", "stock": 500.0, "precio": 10.0},
    {"nombre": "Bizcochuelo", "descripcion": "Bizcochuelo para tiramisú", "es_alergeno": True, "unidad": "pieza", "stock": 5.0, "precio": 800.0},
    {"nombre": "Vino Estancia", "descripcion": "Vino tinto", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 12500.0, "es_producto_terminado": True},
    {"nombre": "Vino Malbec", "descripcion": "Vino Malbec mendocino", "es_alergeno": False, "unidad": "pieza", "stock": 20.0, "precio": 6000.0, "es_producto_terminado": True},
    {"nombre": "Vino Cabernet Sauvignon", "descripcion": "Vino Cabernet Sauvignon", "es_alergeno": False, "unidad": "pieza", "stock": 15.0, "precio": 5500.0, "es_producto_terminado": True},
    {"nombre": "Vino Blend Reserva", "descripcion": "Blend de Malbec y Cabernet", "es_alergeno": False, "unidad": "pieza", "stock": 10.0, "precio": 9000.0, "es_producto_terminado": True},
    {"nombre": "Sprite 500ml", "descripcion": "Sprite 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 59.0, "precio": 1000.0, "es_producto_terminado": True},
    {"nombre": "Coca Cola lata 350ml.", "descripcion": "Coca Cola lata", "es_alergeno": False, "unidad": "pieza", "stock": 200.0, "precio": 1020.0, "es_producto_terminado": True},
    {"nombre": "Coca cola 1.5L", "descripcion": "Coca cola 1.5L", "es_alergeno": False, "unidad": "pieza", "stock": 50.0, "precio": 1850.0, "es_producto_terminado": True},
    {"nombre": "Fanta 500ml", "descripcion": "Fanta 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 50.0, "precio": 750.0, "es_producto_terminado": True},
    {"nombre": "Sprite 1.5L", "descripcion": "Sprite 1.5L", "es_alergeno": False, "unidad": "pieza", "stock": 50.0, "precio": 1800.0, "es_producto_terminado": True},
    {"nombre": "Sprite lata 350ml.", "descripcion": "Sprite lata", "es_alergeno": False, "unidad": "pieza", "stock": 50.0, "precio": 1050.0, "es_producto_terminado": True},
    {"nombre": "Coca-Cola 500ml", "descripcion": "Coca-Cola 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 49.0, "precio": 900.0, "es_producto_terminado": True},
    {"nombre": "Agua Mineral 500ml", "descripcion": "Agua Mineral 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 50.0, "precio": 600.0, "es_producto_terminado": True},
]

PRODUCTOS_INICIALES = [
    #-----------------------------------------Panchos--------------------------------------
    {
        "nombre": "Pancho simple",
        "descripcion": "Pancho simple",
        "imagen": "pancho2.webp",
        "precio_base": "3900.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Panchos",
        "ingredientes": [
            {"nombre": "Agua con gas", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Pancho doble con cheddar",
        "descripcion": "Pancho doble con cheddar: doble salchicha y mucho cheddar",
        "imagen": "pancho_doble.webp",
        "precio_base": "7200.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.60",
        "categoria": "Panchos",
        "ingredientes": [
            {"nombre": "Pan de pancho", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Salchica", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso chedar", "cantidad": "0.200", "unidad": "kilogramo", "removible": True},
            {"nombre": "Mayonesa", "cantidad": "20.000", "unidad": "gramo", "removible": True},
            {"nombre": "Mostaza", "cantidad": "20.000", "unidad": "gramo", "removible": False},
            {"nombre": "Papitas pay", "cantidad": "0.200", "unidad": "kilogramo", "removible": True},
        ],
    },

    {
        "nombre": "Pancho de 25 cm",
        "descripcion": "salchica de 25 cm",
        "imagen": "pancho_25cm.webp",
        "precio_base": "8500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.65",
        "categoria": "Panchos",
        "ingredientes": [
            {"nombre": "Pan de pancho", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Salchica", "cantidad": "3.000", "unidad": "pieza", "removible": False},
            {"nombre": "Mostaza", "cantidad": "25.000", "unidad": "gramo", "removible": True},
            {"nombre": "Mayonesa", "cantidad": "25.000", "unidad": "gramo", "removible": True},
            {"nombre": "Papitas pay", "cantidad": "0.150", "unidad": "kilogramo", "removible": True},
        ],
    },
    #-----------------------------------------Acompañamientos--------------------------------------
    {
        "nombre": "Papas fritas con mayo",
        "descripcion": "Papas fritas con mayonesa",
        "imagen": "papas_con_mayo.webp",
        "precio_base": "5800.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "Papa", "cantidad": "0.500", "unidad": "kilogramo", "removible": False},
            {"nombre": "Mayonesa", "cantidad": "100.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Papas fritas con cheddar",
        "descripcion": "Papas fritas con cheddar",
        "imagen": "papas_cheddar.webp",
        "precio_base": "7200.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "Papa", "cantidad": "0.500", "unidad": "kilogramo", "removible": False},
            {"nombre": "Queso chedar", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "papás chedar",
        "descripcion": "",
        "imagen": "papas-fritas-con-queso-cheddar.webp",
        "precio_base": "2925.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "papas al horno", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Papas Fritas",
        "descripcion": "Porcion de papas fritas crocantes.",
        "imagen": "papas_fritas.jpg",
        "precio_base": "3800.00",
        "stock": 25.0,
        "unidad": "pieza",
        "margen": "0.40",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "Papa", "cantidad": "0.250", "unidad": "kilogramo", "removible": False},
            {"nombre": "Sal Fina", "cantidad": "3.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Aros de cebolla",
        "descripcion": "Aros de cebolla rebozados y fritos",
        "imagen": "aros de cebolla.jpg",
        "precio_base": "4500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.90",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.100", "unidad": "kilogramo", "removible": False},
            {"nombre": "Huevo", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Sal Fina", "cantidad": "3.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Ensalada mixta",
        "descripcion": "Ensalada mixta con rúcula, tomate y aceite de oliva",
        "imagen": "ensalada-mixta.jpg",
        "precio_base": "3500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Acompañamientos",
        "ingredientes": [
            {"nombre": "Rucula", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Tomate fresco", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Aceite de Oliva", "cantidad": "0.020", "unidad": "litro", "removible": True},
            {"nombre": "Sal Fina", "cantidad": "2.000", "unidad": "gramo", "removible": True},
        ],
    },
    #-----------------------------------------Hamburguesas--------------------------------------
    {
        "nombre": "hhss",
        "descripcion": "ss",
        "imagen": "hamburguesa_queso.jpg",
        "precio_base": "9000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Aceite de Oliva", "cantidad": "1.000", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "1.000", "unidad": "kilogramo", "removible": False},
        ],
    },
    
    {
        "nombre": "Hamburguesa con Albahaca",
        "descripcion": "",
        "imagen": "hamburgesa-albahaca.webp",
        "precio_base": "3626.40",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.20",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Albahaca Fresca", "cantidad": "10.000", "unidad": "gramo", "removible": True},
            {"nombre": "Huevo", "cantidad": "2.000", "unidad": "pieza", "removible": True},
            {"nombre": "Medallon de Carne", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "2.000", "unidad": "pieza", "removible": True},
        ],
    },
    {
        "nombre": "Hamburguesa de queso",
        "descripcion": "queso carne",
        "imagen": "hamburguesa_queso.jpg",
        "precio_base": "379.08",
        "stock": 20.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "200.000", "unidad": "gramo", "removible": False},
            {"nombre": "Tomate Triturado", "cantidad": "0.200", "unidad": "pieza", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "pieza", "removible": False},
        ],
    },
    {
        "nombre": "Hamburguesa Completa",
        "descripcion": "Hamburguesa con medallon de carne y pan artesanal.",
        "imagen": "hamburguesa.jpg",
        "precio_base": "7200.00",
        "stock": 30.0,
        "unidad": "pieza",
        "margen": "0.45",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Medallon de Carne", "cantidad": "1.000", "unidad": "pieza", "removible": False},
        ],
    },
    {
        "nombre": "Hamburguesa con roquefort",
        "descripcion": "Hamburguesa de carne con queso roquefort",
        "imagen": "hamburguesa_roquefort2.jpg",
        "precio_base": "7506.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Medallon de Carne", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso roquefort", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Queso Mozzarella", "cantidad": "0.050", "unidad": "kilogramo", "removible": True},
            {"nombre": "Tomate Triturado", "cantidad": "0.100", "unidad": "litro", "removible": True},
        ],
    },
    {
        "nombre": "Hamburguesa triple con cheddar",
        "descripcion": "Hamburguesa con cheddar: pan de hamburguesa, 3 medallones de carne y abundante cheddar.",
        "imagen": "hamburguesa_triple.jpg",
        "precio_base": "10350.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Hamburguesas",
        "ingredientes": [
            {"nombre": "Medallon de Carne", "cantidad": "3.000", "unidad": "pieza", "removible": False},
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso chedar", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    #-----------------------------------------Tintos--------------------------------------
    {
        "nombre": "Vino Estancia",
        "descripcion": "prodcuto elaborado en Mendoza",
        "imagen": "vino-tinto.webp",
        "precio_base": "25000.00",
        "stock": 30.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Tintos",
        "ingredientes": [
            {"nombre": "Vino Estancia", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
     {
        "nombre": "Vino Malbec",
        "descripcion": "Vino Malbec mendocino, cuerpo medio y frutado",
        "imagen": "vino_malbec.png",
        "precio_base": "12000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Tintos",
        "ingredientes": [
            {"nombre": "Vino Malbec", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Vino Cabernet Sauvignon",
        "descripcion": "Vino Cabernet Sauvignon, taninos firmes y color intenso",
        "imagen": "tomero-cabernet-sauvignon.jpg",
        "precio_base": "11000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Tintos",
        "ingredientes": [
            {"nombre": "Vino Cabernet Sauvignon", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Vino Blend Reserva",
        "descripcion": "Blend de Malbec y Cabernet, reserva especial",
        "imagen": "vino_reserva.png",
        "precio_base": "18000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.90",
        "categoria": "Tintos",
        "ingredientes": [
            {"nombre": "Vino Blend Reserva", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    #-----------------------------------------Gaseosas--------------------------------------
    {
        "nombre": "Sprite 500ml",
        "descripcion": "",
        "imagen": "sprite-500ml.webp",
        "precio_base": "2000.00",
        "stock": 59.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Sprite 500ml", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Coca Cola lata 350ml.",
        "descripcion": "Coca Cola lata 350ml.",
        "imagen": "coca-lata-350ml.webp",
        "precio_base": "2040.00",
        "stock": 200.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Coca Cola lata 350ml.", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Coca cola 1.5L",
        "descripcion": "Coca cola 1.5L",
        "imagen": "coca1.5l.webp",
        "precio_base": "3700.00",
        "stock": 50.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Coca cola 1.5L", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Fanta 500ml",
        "descripcion": "",
        "imagen": "fanta500ml.webp",
        "precio_base": "1500.00",
        "stock": 50.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Fanta 500ml", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Sprite 1.5L",
        "descripcion": "Sprite 1.5L",
        "imagen": "Gaseosa-Sprite-1-5-Lt-1-42.webp",
        "precio_base": "3600.00",
        "stock": 50.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Sprite 1.5L", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    {
        "nombre": "Sprite lata 350ml.",
        "descripcion": "Sprite lata 350ml.",
        "imagen": "sprite_lata.jpg",
        "precio_base": "2100.00",
        "stock": 50.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Sprite lata 350ml.", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],    
    },
    {
        "nombre": "Coca-Cola 500ml",
        "descripcion": "Gaseosa Coca-Cola de 500 ml.",
        "imagen": "cocacola_500ml.jpg",
        "precio_base": "1800.00",
        "stock": 49.0,
        "unidad": "pieza",
        "margen": "0.30",
        "categoria": "Gaseosas",
        "ingredientes": [
            {"nombre": "Coca-Cola 500ml", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    #-----------------------------------------Gaseosas--------------------------------------
    {
        "nombre": "Agua Mineral 500ml",
        "descripcion": "Agua mineral sin gas de 500 ml.",
        "imagen": "agua_500ml.jpg",
        "precio_base": "1200.00",
        "stock": 50.0,
        "unidad": "pieza",
        "margen": "0.25",
        "categoria": "Bebidas",
        "ingredientes": [
            {"nombre": "Agua Mineral 500ml", "cantidad": "1.000", "unidad": "pieza", "removible": False}
        ],
    },
    
    #-----------------------------------------Empanadas--------------------------------------
    {
        "nombre": "Docena de empanadas de jamón y queso",
        "descripcion": "Docena de empanadas de jamón y queso",
        "imagen": "empanada-jamo-y-queso.jpg",
        "precio_base": "27000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Empanadas",
        "ingredientes": [
            {"nombre": "Queso Mozzarella", "cantidad": "1.200", "unidad": "kilogramo", "removible": False},
            {"nombre": "Tapita de empanada", "cantidad": "12.000", "unidad": "pieza", "removible": False},
            {"nombre": "Jamon cocido", "cantidad": "0.600", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Docena de empanadas de carne",
        "descripcion": "Docena de empanadas de carne molida",
        "imagen": "empanadas-carne.avif",
        "precio_base": "20700.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Empanadas",
        "ingredientes": [
            {"nombre": "Tapita de empanada", "cantidad": "12.000", "unidad": "pieza", "removible": False},
            {"nombre": "Picadillo", "cantidad": "1.200", "unidad": "kilogramo", "removible": False},
        ],
    },
    
    {
        "nombre": "Docena de empanadas de quesos",
        "descripcion": "Docena de empanadas de quesos : mozzarella y roquefort",
        "imagen": "empanada_queso.webp",
        "precio_base": "27000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Empanadas",
        "ingredientes": [
            {"nombre": "Tapita de empanada", "cantidad": "12.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "1.100", "unidad": "kilogramo", "removible": False},
            {"nombre": "Queso roquefort", "cantidad": "0.600", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Docena de empanada árabes",
        "descripcion": "Docena de empanada árabes de carne",
        "imagen": "empanadas-arabes.jpg",
        "precio_base": "23600.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Empanadas",
        "ingredientes": [
            {"nombre": "Tapita de empanada", "cantidad": "12.000", "unidad": "pieza", "removible": False},
            {"nombre": "Picadillo", "cantidad": "1.000", "unidad": "kilogramo", "removible": False},
        ],
    },
    #-----------------------------------------Pizzas--------------------------------------
    {
        "nombre": "Pizza Muzzarella",
        "descripcion": "Pizza clasica con salsa de tomate, mozzarella y oregano.",
        "imagen": "pizza_muzzarella.jpg",
        "precio_base": "8500.00",
        "stock": 20.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 0000", "cantidad": "300.000", "unidad": "gramo", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "15.000", "unidad": "gramo", "removible": False},
            {"nombre": "Tomate Triturado", "cantidad": "0.150", "unidad": "litro", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "180.000", "unidad": "gramo", "removible": False},
            {"nombre": "Oregano", "cantidad": "2.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Pizzas de jamón crudo y rúcula",
        "descripcion": "Pizzas de jamón crudo y rúcula",
        "imagen": "pizza_jamon_rucula_2.webp",
        "precio_base": "19350.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.400", "unidad": "kilogramo", "removible": False},
            {"nombre": "Rucula", "cantidad": "1.000", "unidad": "pieza", "removible": True},
            {"nombre": "Jamón crudo", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza especial jamon cocido y morrón",
        "descripcion": "Pizza especial jamon cocido y morrón",
        "imagen": "pizza--jamon-morrones.jpg",
        "precio_base": "18770.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 0000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Aceite de Oliva", "cantidad": "0.010", "unidad": "litro", "removible": False},
            {"nombre": "Jamon cocido", "cantidad": "0.350", "unidad": "kilogramo", "removible": True},
            {"nombre": "Morrón", "cantidad": "0.200", "unidad": "kilogramo", "removible": True},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza margarita",
        "descripcion": "Pizza margarita",
        "imagen": "pizza_margarita.png",
        "precio_base": "8070.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Queso Mozzarella", "cantidad": "0.400", "unidad": "kilogramo", "removible": False},
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Albahaca Fresca", "cantidad": "20.000", "unidad": "gramo", "removible": True},
            {"nombre": "Tomate Triturado", "cantidad": "0.300", "unidad": "litro", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza peperoni ",
        "descripcion": "Pizza peperoni",
        "imagen": "pizza_peperoni.webp",
        "precio_base": "14281.25",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.50",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Harina 000", "cantidad": "0.350", "unidad": "kilogramo", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Pepperoni", "cantidad": "0.300", "unidad": "kilogramo", "removible": True},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza hawaii",
        "descripcion": "Pizza hawaii con jamón cocido y ananá",
        "imagen": "hawaiian-pizza.jpg",
        "precio_base": "22270.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Ananá", "cantidad": "0.400", "unidad": "kilogramo", "removible": True},
            {"nombre": "Azucar", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Jamon cocido", "cantidad": "0.400", "unidad": "kilogramo", "removible": True},
            {"nombre": "Levadura Fresca", "cantidad": "4.000", "unidad": "gramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.400", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza napolitana",
        "descripcion": "Pizza con salsa de tomate, mozzarella y rodajas de tomate fresco",
        "imagen": "pizza_napolitana.png",
        "precio_base": "9500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Tomate Triturado", "cantidad": "0.200", "unidad": "litro", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Tomate fresco", "cantidad": "0.200", "unidad": "kilogramo", "removible": True},
            {"nombre": "Oregano", "cantidad": "2.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Pizza fugazzeta",
        "descripcion": "Pizza rellena de mozzarella con cebolla caramelizada",
        "imagen": "pizza_fugazeta.webp",
        "precio_base": "11000.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 0000", "cantidad": "0.350", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.120", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "6.000", "unidad": "gramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.500", "unidad": "kilogramo", "removible": False},
            {"nombre": "Aceite de Oliva", "cantidad": "0.020", "unidad": "litro", "removible": False},
            {"nombre": "Sal Fina", "cantidad": "5.000", "unidad": "gramo", "removible": False},
        ],
    },
    {
        "nombre": "Pizza cuatro quesos",
        "descripcion": "Pizza con mozzarella, roquefort, cheddar y queso en fetas",
        "imagen": "pizza_4_quesos.avif",
        "precio_base": "14500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.200", "unidad": "kilogramo", "removible": False},
            {"nombre": "Queso roquefort", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Queso chedar", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Queso en fetas", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
        ],
    },
    {
        "nombre": "Pizza de verduras",
        "descripcion": "Pizza con morrón, tomate fresco, albahaca y aceite de oliva",
        "imagen": "Pizza-de-vegetales.webp",
        "precio_base": "10500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Tomate Triturado", "cantidad": "0.150", "unidad": "litro", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.250", "unidad": "kilogramo", "removible": False},
            {"nombre": "Morrón", "cantidad": "0.150", "unidad": "kilogramo", "removible": True},
            {"nombre": "Tomate fresco", "cantidad": "0.150", "unidad": "kilogramo", "removible": True},
            {"nombre": "Albahaca Fresca", "cantidad": "10.000", "unidad": "gramo", "removible": True},
            {"nombre": "Aceite de Oliva", "cantidad": "0.015", "unidad": "litro", "removible": True},
        ],
    },
    {
        "nombre": "Pizza BBQ con pollo",
        "descripcion": "Pizza con salsa BBQ, pechuga de pollo y mozzarella",
        "imagen": "pizza_pollo.avif",
        "precio_base": "13500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "1.00",
        "categoria": "Pizzas",
        "ingredientes": [
            {"nombre": "Harina 000", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Agua Filtrada", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Levadura Fresca", "cantidad": "5.000", "unidad": "gramo", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.300", "unidad": "kilogramo", "removible": False},
            {"nombre": "Pechuga de pollo", "cantidad": "0.250", "unidad": "kilogramo", "removible": False},
            {"nombre": "Tomate Triturado", "cantidad": "0.100", "unidad": "litro", "removible": False},
        ],
    },
    #-----------------------------------------Postres--------------------------------------
    {
        "nombre": "Flan Casero",
        "descripcion": "Flan casero individual.",
        "imagen": "flan.jpg",
        "precio_base": "2900.00",
        "stock": 18.0,
        "unidad": "pieza",
        "margen": "0.50",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Leche", "cantidad": "0.120", "unidad": "litro", "removible": False},
            {"nombre": "Huevo", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "40.000", "unidad": "gramo", "removible": False},
        ],
    },
    {
        "nombre": "Tiramisú",
        "descripcion": "Tiramisú clásico con crema, café y cacao",
        "imagen": "Tiramisú.jpg",
        "precio_base": "4500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Bizcochuelo", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Cafe", "cantidad": "50.000", "unidad": "mililitro", "removible": False},
            {"nombre": "Crema", "cantidad": "0.150", "unidad": "litro", "removible": False},
            {"nombre": "Azucar", "cantidad": "50.000", "unidad": "gramo", "removible": False},
            {"nombre": "Cacao en polvo", "cantidad": "20.000", "unidad": "gramo", "removible": False},
        ],
    },
    {
        "nombre": "Cheesecake de frutos rojos",
        "descripcion": "Cheesecake con base de galleta y coulis de frutos rojos",
        "imagen": "Cheesecake de frutos rojos.jpg",
        "precio_base": "4800.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.75",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Queso crema", "cantidad": "0.200", "unidad": "kilogramo", "removible": False},
            {"nombre": "Galletita", "cantidad": "100.000", "unidad": "gramo", "removible": False},
            {"nombre": "Manteca", "cantidad": "0.050", "unidad": "kilogramo", "removible": False},
            {"nombre": "Azucar", "cantidad": "80.000", "unidad": "gramo", "removible": False},
            {"nombre": "Frutos rojos", "cantidad": "0.150", "unidad": "kilogramo", "removible": True},
        ],
    },
    {
        "nombre": "Panqueques con dulce de leche",
        "descripcion": "Panqueques caseros rellenos de dulce de leche",
        "imagen": "Panqueques con dulce de leche.webp",
        "precio_base": "3900.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.70",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Harina 0000", "cantidad": "0.100", "unidad": "kilogramo", "removible": False},
            {"nombre": "Leche", "cantidad": "0.150", "unidad": "litro", "removible": False},
            {"nombre": "Huevo", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "20.000", "unidad": "gramo", "removible": False},
            {"nombre": "Dulce de leche", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Manteca", "cantidad": "0.020", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Arroz con leche",
        "descripcion": "Arroz con leche cremoso con canela y vainilla",
        "imagen": "Arroz con leche.jpg",
        "precio_base": "2800.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Arroz", "cantidad": "0.080", "unidad": "kilogramo", "removible": False},
            {"nombre": "Leche", "cantidad": "0.300", "unidad": "litro", "removible": False},
            {"nombre": "Azucar", "cantidad": "60.000", "unidad": "gramo", "removible": False},
            {"nombre": "Esencia de vainilla", "cantidad": "5.000", "unidad": "mililitro", "removible": True},
        ],
    },
    {
        "nombre": "Brownie de chocolate",
        "descripcion": "Brownie húmedo de chocolate con nueces",
        "imagen": "Brownie de chocolate.webp",
        "precio_base": "3600.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.75",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Harina 0000", "cantidad": "0.080", "unidad": "kilogramo", "removible": False},
            {"nombre": "Huevo", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "100.000", "unidad": "gramo", "removible": False},
            {"nombre": "Cacao en polvo", "cantidad": "40.000", "unidad": "gramo", "removible": False},
            {"nombre": "Manteca", "cantidad": "0.100", "unidad": "kilogramo", "removible": False},
            {"nombre": "Nueces", "cantidad": "50.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Flan con dulce de leche",
        "descripcion": "Flan casero con dulce de leche",
        "imagen": "Flan con dulce de leche.jpg",
        "precio_base": "3500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.60",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Leche", "cantidad": "0.120", "unidad": "litro", "removible": False},
            {"nombre": "Huevo", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "40.000", "unidad": "gramo", "removible": False},
            {"nombre": "Dulce de leche", "cantidad": "0.080", "unidad": "kilogramo", "removible": True},
        ],
    },
    {
        "nombre": "Budín de pan",
        "descripcion": "Budín de pan casero con pasas y vainilla",
        "imagen": "budin de pan.jpg",
        "precio_base": "3200.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.70",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Pan de miga", "cantidad": "3.000", "unidad": "pieza", "removible": False},
            {"nombre": "Leche", "cantidad": "0.200", "unidad": "litro", "removible": False},
            {"nombre": "Huevo", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "60.000", "unidad": "gramo", "removible": False},
            {"nombre": "Esencia de vainilla", "cantidad": "5.000", "unidad": "mililitro", "removible": True},
            {"nombre": "Manteca", "cantidad": "0.030", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Mousse de chocolate",
        "descripcion": "Mousse de chocolate artesanal",
        "imagen": "Mousse de chocolate.avif",
        "precio_base": "3800.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.75",
        "categoria": "Postres",
        "ingredientes": [
            {"nombre": "Huevo", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Azucar", "cantidad": "50.000", "unidad": "gramo", "removible": False},
            {"nombre": "Crema", "cantidad": "0.100", "unidad": "litro", "removible": False},
            {"nombre": "Cacao en polvo", "cantidad": "30.000", "unidad": "gramo", "removible": False},
            {"nombre": "Manteca", "cantidad": "0.050", "unidad": "kilogramo", "removible": False},
        ],
    },
    
    #-----------------------------------------Tostados--------------------------------------
    {
        "nombre": "Tostado de jamón y queso",
        "descripcion": "Tostado clásico con jamón cocido y queso en fetas",
        "imagen": "tostato de jamos y queso.avif",
        "precio_base": "3500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Tostados",
        "ingredientes": [
            {"nombre": "Pan de miga", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Jamon cocido", "cantidad": "0.080", "unidad": "kilogramo", "removible": False},
            {"nombre": "Queso en fetas", "cantidad": "0.060", "unidad": "kilogramo", "removible": False},
        ],
    },
    {
        "nombre": "Tostado de queso y tomate",
        "descripcion": "Tostado con queso mozzarella y tomate fresco",
        "imagen": "Tostado de queso y tomate.jpg",
        "precio_base": "3200.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.80",
        "categoria": "Tostados",
        "ingredientes": [
            {"nombre": "Pan de miga", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso Mozzarella", "cantidad": "0.080", "unidad": "kilogramo", "removible": False},
            {"nombre": "Tomate fresco", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
        ],
    },
    #-----------------------------------------Sandwiches--------------------------------------
    {
        "nombre": "Sandwich de milanesa",
        "descripcion": "Sandwich de milanesa de carne con lechuga y tomate",
        "imagen": "Sandwich_milanesa.avif",
        "precio_base": "7500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.70",
        "categoria": "Sandwiches",
        "ingredientes": [
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Medallon de Carne", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Lechuga", "cantidad": "0.500", "unidad": "pieza", "removible": True},
            {"nombre": "Tomate fresco", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Mayonesa", "cantidad": "30.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Sandwich de pollo",
        "descripcion": "Sandwich de pechuga de pollo a la plancha con lechuga y tomate",
        "imagen": "sandwich_pollo.jpg",
        "precio_base": "6500.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.70",
        "categoria": "Sandwiches",
        "ingredientes": [
            {"nombre": "Pan de Hamburguesa", "cantidad": "1.000", "unidad": "pieza", "removible": False},
            {"nombre": "Pechuga de pollo", "cantidad": "0.200", "unidad": "kilogramo", "removible": False},
            {"nombre": "Lechuga", "cantidad": "0.500", "unidad": "pieza", "removible": True},
            {"nombre": "Tomate fresco", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
            {"nombre": "Mayonesa", "cantidad": "30.000", "unidad": "gramo", "removible": True},
        ],
    },
    {
        "nombre": "Sandwich vegetal",
        "descripcion": "Sandwich de queso, lechuga y tomate fresco",
        "imagen": "sandwich_vegetal.jpg",
        "precio_base": "4200.00",
        "stock": 0.0,
        "unidad": "pieza",
        "margen": "0.90",
        "categoria": "Sandwiches",
        "ingredientes": [
            {"nombre": "Pan de miga", "cantidad": "2.000", "unidad": "pieza", "removible": False},
            {"nombre": "Queso en fetas", "cantidad": "0.080", "unidad": "kilogramo", "removible": False},
            {"nombre": "Lechuga", "cantidad": "0.500", "unidad": "pieza", "removible": True},
            {"nombre": "Tomate fresco", "cantidad": "0.100", "unidad": "kilogramo", "removible": True},
        ],
    },
    
    
]


def run() -> None:
    print("=== Seed - Food Store (PostgreSQL + SQLModel) ===")
    create_all_tables()

    with Session(engine) as session:
        # 1. Seed Roles - catalogo (PK semantica)
        print("Sedeando roles...")
        for r_data in ROLES_INICIALES:
            existing = session.exec(select(Rol).where(Rol.codigo == r_data["codigo"])).first()
            if not existing:
                r = Rol(**r_data)
                session.add(r)
                print(f"  [+] Rol creado: {r.codigo}")
            else:
                existing.nombre = r_data["nombre"]
                existing.descripcion = r_data["descripcion"]
                session.add(existing)
                print(f"  [=] Rol actualizado: {r_data['codigo']}")

        session.flush()

        # 2. Seed Usuarios
        print("Sedeando usuarios...")
        for u_data in USUARIOS_INICIALES:
            existing = session.exec(select(Usuario).where(Usuario.email == u_data["email"])).first()
            if not existing:
                u = Usuario(
                    nombre=u_data["nombre"],
                    apellido=u_data["apellido"],
                    email=u_data["email"],
                    password_hash=hash_password(u_data["password"]),
                )
                session.add(u)
                session.flush()  # para obtener u.id

                # Asignar roles
                for rol_codigo in u_data["roles"]:
                    ur = UsuarioRol(usuario_id=u.id, rol_codigo=rol_codigo)
                    session.add(ur)

                print(f"  [+] Usuario creado: {u.email} -> roles: {u_data['roles']}")
            else:
                print(f"  [=] Usuario ya existe: {u_data['email']}")

        # 3. Seed Unidades de Medida - ANTES que ingredientes (FK)
        print("Sedeando unidades de medida...")
        for u_data in UNIDADES_MEDIDA_INICIALES:
            existing = session.exec(select(UnidadMedida).where(UnidadMedida.nombre == u_data["nombre"])).first()
            if not existing:
                u = UnidadMedida(**u_data)
                session.add(u)
                print(f"  [+] Unidad de Medida creada: {u.nombre}")
            else:
                print(f"  [=] Unidad de Medida ya existe: {u_data['nombre']}")

        session.flush()

        # 4. Seed Ingredientes
        print("Sedeando ingredientes...")
        for i_data in INGREDIENTES_INICIALES:
            existing = session.exec(select(Ingrediente).where(Ingrediente.nombre == i_data["nombre"])).first()
            unidad_obj = session.exec(select(UnidadMedida).where(UnidadMedida.nombre == i_data["unidad"])).first()
            unidad_id = unidad_obj.id if unidad_obj else None

            if not existing:
                i = Ingrediente(
                    nombre=i_data["nombre"],
                    descripcion=i_data["descripcion"],
                    es_alergeno=i_data["es_alergeno"],
                    es_producto_terminado=i_data.get("es_producto_terminado", False),
                    unidad_medida_id=unidad_id,
                    stock_actual=i_data["stock"],
                    stock_minimo=i_data.get("stock_minimo", 0.0),
                    precio_costo=i_data["precio"]
                )
                session.add(i)
                print(f"  [+] Ingrediente creado: {i.nombre} ({i_data['unidad']})")
            else:
                existing.unidad_medida_id = unidad_id
                existing.stock_actual = i_data["stock"]
                existing.stock_minimo = i_data.get("stock_minimo", 0.0)
                existing.precio_costo = i_data["precio"]
                existing.es_producto_terminado = i_data.get("es_producto_terminado", False)
                session.add(existing)
                print(f"  [=] Ingrediente actualizado: {existing.nombre}")

        session.flush()

        # 5. Seed Categorias
        print("Sedeando categorias...")
        for c_data in CATEGORIAS_INICIALES:
            padre_id = None
            if c_data["padre"]:
                padre = session.exec(select(Categoria).where(Categoria.nombre == c_data["padre"])).first()
                padre_id = padre.id if padre else None

            existing = session.exec(select(Categoria).where(Categoria.nombre == c_data["nombre"])).first()
            if not existing:
                categoria = Categoria(
                    nombre=c_data["nombre"],
                    descripcion=c_data["descripcion"],
                    padre_id=padre_id,
                )
                session.add(categoria)
                print(f"  [+] Categoria creada: {c_data['nombre']}")
            else:
                existing.descripcion = c_data["descripcion"]
                existing.padre_id = padre_id
                session.add(existing)
                print(f"  [=] Categoria actualizada: {existing.nombre}")

            session.flush()

        # 6. Seed Productos
        print("Sedeando productos...")
        for p_data in PRODUCTOS_INICIALES:
            unidad_obj = session.exec(select(UnidadMedida).where(UnidadMedida.nombre == p_data["unidad"])).first()
            categoria_obj = session.exec(select(Categoria).where(Categoria.nombre == p_data["categoria"])).first()
            image_url = f"/static/uploads/seed/{p_data['imagen']}"

            existing = session.exec(select(Producto).where(Producto.nombre == p_data["nombre"])).first()
            if not existing:
                producto = Producto(
                    nombre=p_data["nombre"],
                    descripcion=p_data["descripcion"],
                    imagen_url=image_url,
                    imagenes=[image_url],
                    precio_base=Decimal(p_data["precio_base"]),
                    stock_cantidad=p_data["stock"],
                    disponible=True,
                    unidad_venta_id=unidad_obj.id if unidad_obj else None,
                    margen_ganancia=Decimal(p_data["margen"]),
                )
                session.add(producto)
                session.flush()
                print(f"  [+] Producto creado: {producto.nombre}")
            else:
                producto = existing
                producto.descripcion = p_data["descripcion"]
                producto.imagen_url = image_url
                producto.imagenes = [image_url]
                producto.precio_base = Decimal(p_data["precio_base"])
                producto.stock_cantidad = p_data["stock"]
                producto.disponible = True
                producto.unidad_venta_id = unidad_obj.id if unidad_obj else None
                producto.margen_ganancia = Decimal(p_data["margen"])
                session.add(producto)
                session.flush()
                print(f"  [=] Producto actualizado: {producto.nombre}")

            for rel in session.exec(select(ProductoCategoria).where(ProductoCategoria.producto_id == producto.id)).all():
                session.delete(rel)
            for rel in session.exec(select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto.id)).all():
                session.delete(rel)
            session.flush()

            if categoria_obj:
                session.add(
                    ProductoCategoria(
                        producto_id=producto.id,
                        categoria_id=categoria_obj.id,
                        es_principal=True,
                    )
                )

            for ing_data in p_data["ingredientes"]:
                ingrediente = session.exec(select(Ingrediente).where(Ingrediente.nombre == ing_data["nombre"])).first()
                unidad_receta = session.exec(select(UnidadMedida).where(UnidadMedida.nombre == ing_data["unidad"])).first()
                if ingrediente and unidad_receta:
                    session.add(
                        ProductoIngrediente(
                            producto_id=producto.id,
                            ingrediente_id=ingrediente.id,
                            cantidad=Decimal(ing_data["cantidad"]),
                            unidad_medida_id=unidad_receta.id,
                            es_removible=ing_data["removible"],
                        )
                    )

        # 7. Seed Estados de Pedido
        print("Sedeando estados de pedido...")
        for e_data in ESTADOS_PEDIDO_INICIALES:
            existing = session.exec(select(EstadoPedido).where(EstadoPedido.codigo == e_data["codigo"])).first()
            if not existing:
                session.add(EstadoPedido(**e_data))
                print(f"  [+] Estado creado: {e_data['codigo']}")
            else:
                existing.descripcion = e_data["descripcion"]
                existing.orden = e_data["orden"]
                existing.es_terminal = e_data["es_terminal"]
                session.add(existing)
                print(f"  [=] Estado actualizado: {e_data['codigo']}")

        # 8. Seed Formas de Pago
        print("Sedeando formas de pago...")
        for f_data in FORMAS_PAGO_INICIALES:
            existing = session.exec(select(FormaPago).where(FormaPago.codigo == f_data["codigo"])).first()
            if not existing:
                session.add(FormaPago(**f_data))
                print(f"  [+] Forma de pago creada: {f_data['codigo']}")
            else:
                print(f"  [=] Forma de pago ya existe: {f_data['codigo']}")

        session.commit()
    print("=== Seed completado exitosamente ===")


if __name__ == "__main__":
    run()

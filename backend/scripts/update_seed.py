import re
import sys

filepath = 'c:/AZUL/programacion/UTN/Cuarto Semestre/Programacion 4 Magni/FoodStore/FOOD_STORE_Magni/backend/app/db/seed.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make Agua con gas a finished product
content = content.replace(
    '{"nombre": "Agua con gas", "descripcion": "Agua mineral con gas 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 900.0}',
    '{"nombre": "Agua con gas", "descripcion": "Agua mineral con gas 500ml", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 900.0, "es_producto_terminado": True}'
)

# New ingredients to insert before the end of INGREDIENTES_INICIALES
new_ingredientes = """    {"nombre": "Vino Estancia", "descripcion": "Vino tinto", "es_alergeno": False, "unidad": "pieza", "stock": 30.0, "precio": 12500.0, "es_producto_terminado": True},
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
]"""

content = content.replace(']\n\nPRODUCTOS_INICIALES = [', new_ingredientes + '\n\nPRODUCTOS_INICIALES = [')

# Now add the ingredient entries inside the products
def add_ingredient_to_product(prod_name, ing_name):
    global content
    
    # We find the product block
    # It has "nombre": "prod_name" and then "ingredientes": []
    
    pattern = r'("nombre":\s*"' + re.escape(prod_name) + r'",.*?)"ingredientes":\s*\[\s*(?:\{.*?\}\s*,?\s*)*\]'
    
    replacement = r'\1"ingredientes": [\n            {"nombre": "' + ing_name + r'", "cantidad": "1.000", "unidad": "pieza", "removible": False}\n        ]'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

add_ingredient_to_product("Vino Estancia", "Vino Estancia")
add_ingredient_to_product("Vino Malbec", "Vino Malbec")
add_ingredient_to_product("Vino Cabernet Sauvignon", "Vino Cabernet Sauvignon")
add_ingredient_to_product("Vino Blend Reserva", "Vino Blend Reserva")

add_ingredient_to_product("Sprite 500ml", "Sprite 500ml")
add_ingredient_to_product("Coca Cola lata 350ml.", "Coca Cola lata 350ml.")
add_ingredient_to_product("Coca cola 1.5L", "Coca cola 1.5L")
add_ingredient_to_product("Fanta 500ml", "Fanta 500ml")
add_ingredient_to_product("Sprite 1.5L", "Sprite 1.5L")
add_ingredient_to_product("Sprite lata 350ml.", "Sprite lata 350ml.")
add_ingredient_to_product("Coca-Cola 500ml", "Coca-Cola 500ml")
add_ingredient_to_product("Agua Mineral 500ml", "Agua Mineral 500ml")
add_ingredient_to_product("Agua con gas", "Agua con gas") # Wait, is Agua con gas in products? 

# Let's check if Agua con gas is in products? Wait, I can just run it.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
    host=os.getenv("POSTGRES_HOST"),
    port=os.getenv("POSTGRES_PORT")
)
conn.autocommit = True

try:
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE ingredientes ADD COLUMN IF NOT EXISTS es_producto_terminado BOOLEAN NOT NULL DEFAULT FALSE;")
        print("Column es_producto_terminado added successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()

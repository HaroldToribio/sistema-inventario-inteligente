from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from typing import Union, Tuple

from backend.repositories.ventas_repository import VentasRepository
from backend.repositories.clientes_repository import ClientesRepository
from backend.data_loader import cargar_datos
from backend.services.prediccion_service import predecir_demanda
from backend.services.recomendacion_service import recomendar_para_cliente

app = Flask(__name__)
CORS(app)

repo          = VentasRepository()
clientes_repo = ClientesRepository()

# =========================
# PRODUCTOS
# =========================

@app.route('/productos', methods=['GET'])
def listar_productos():
    try:
        data = repo.get_productos()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/productos', methods=['POST'])
def crear_producto():
    try:
        data = request.json

        nombre          = data.get('nombre')
        precio          = data.get('precio')
        promedio_ventas = data.get('promedio_ventas')

        if not nombre or precio is None:
            return jsonify({"error": "Nombre y precio son requeridos"}), 400

        nuevo_id = repo.crear_producto(nombre, precio)

        if promedio_ventas and int(promedio_ventas) > 0 and nuevo_id:
            repo.simular_ventas_historicas(nuevo_id, int(promedio_ventas), dias=90)

        return jsonify({"mensaje": "Producto creado", "id_producto": nuevo_id}), 201

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# =========================
# DELETE PRODUCTO
# =========================
@app.route('/productos/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    try:
        repo.eliminar_producto(id)
        return jsonify({"mensaje": "Producto eliminado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# VENTAS
# =========================

@app.route('/ventas', methods=['GET'])
def obtener_ventas_general():
    try:
        data = repo.obtener_ventas()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ventas/<int:id_producto>')
def obtener_ventas(id_producto):
    try:
        ventas = repo.obtener_ventas_por_producto(id_producto)
        return jsonify(ventas)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ventas-por-producto', methods=['GET'])
def ventas_por_producto():
    try:
        data = repo.obtener_resumen_ventas()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# PREDICCION ML
# =========================
@app.route('/prediccion/<int:producto_id>')
def obtener_prediccion(producto_id):
    try:
        dias = request.args.get('dias', default=7, type=int)
        df = cargar_datos(producto_id)
        resultado = predecir_demanda(df, dias=dias)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# DASHBOARD
# =========================
@app.route('/dashboard')
def dashboard():
    try:
        producto = request.args.get('producto', type=int)
        dias     = request.args.get('dias', type=int)

        if not producto or not dias:
            return jsonify({"error": "Parámetros inválidos"}), 400

        data = repo.get_dashboard(producto, dias)
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# CLIENTES
# =========================

@app.route('/clientes', methods=['GET'])
def listar_clientes():
    try:
        data = clientes_repo.listar_clientes()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/clientes', methods=['POST'])
def crear_cliente():
    try:
        data   = request.json
        nombre = data.get('nombre')
        email  = data.get('email', '')

        if not nombre:
            return jsonify({"error": "Nombre es requerido"}), 400

        nuevo_id = clientes_repo.crear_cliente(nombre, email)

        # Simular 2-3 compras iniciales para que el filtrado colaborativo funcione
        if nuevo_id:
            clientes_repo.simular_compras(nuevo_id, num_productos=2)

        return jsonify({"mensaje": "Cliente creado", "id_cliente": nuevo_id}), 201

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


# =========================
# RECOMENDACIONES
# =========================

@app.route('/recomendaciones/<int:id_cliente>', methods=['GET'])
def obtener_recomendaciones(id_cliente):
    """
    Filtrado colaborativo: recomienda productos basándose en
    clientes con patrones de compra similares.
    """
    try:
        top_n = request.args.get('top', default=3, type=int)

        # Datos necesarios para el algoritmo
        filas_compras   = clientes_repo.obtener_matriz_compras()
        productos_lista = repo.get_productos()

        resultado = recomendar_para_cliente(
            id_cliente,
            filas_compras,
            productos_lista,
            top_n=top_n
        )
        return jsonify(resultado), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# REPORTES AVANZADOS
# =========================

@app.route('/reportes/ventas-por-mes', methods=['GET'])
def ventas_por_mes():
    try:
        data = repo.obtener_ventas_por_mes()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reportes/pares-productos', methods=['GET'])
def pares_productos():
    try:
        data = repo.obtener_pares_productos()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return {
        "mensaje": "API funcionando",
        "endpoints": ["/productos", "/clientes", "/recomendaciones/<id>", "/prediccion/<id>", "/dashboard"]
    }


if __name__ == '__main__':
    app.run(debug=True)
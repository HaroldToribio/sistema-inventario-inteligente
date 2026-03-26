from backend.database.connection import DatabaseConnection
from flask import jsonify, request, Response
from typing import Union, Tuple

class VentasRepository:

    def get_productos(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ListarProductos')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data

    def crear_producto(self, nombre, precio):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor()

        cursor.callproc('CrearProducto', (nombre, precio))

        conn.commit()

        # Obtener el id_producto recién insertado
        cursor.execute("SELECT LAST_INSERT_ID() AS id")
        row = cursor.fetchone()
        nuevo_id = row[0] if row else None #type: ignore

        conn.close()
        return nuevo_id

    def simular_ventas_historicas(self, id_producto, promedio_diario, dias=90):
        """Llama al SP que genera ventas simuladas para un producto nuevo."""
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor()

        cursor.callproc('SimularVentasHistoricas', (id_producto, promedio_diario, dias))

        conn.commit()
        conn.close()

    def eliminar_producto(self, id):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor()

        cursor.callproc('EliminarProducto', (id,))

        conn.commit()
        conn.close()

    def get_dashboard(self, producto=None, dias=None):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ObtenerDashboardResumen')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()

        if len(data) > 0:
            return data[0]
        else:
            return {}
    
    def obtener_resumen_ventas(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ObtenerResumenVentas')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data
    
    def obtener_ventas_por_producto(self, id_producto):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ObtenerVentasPorProducto', (id_producto,))

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data
    
    def obtener_ventas(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ObtenerVentasTotales')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data
    def obtener_ventas_por_mes(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('ObtenerVentasPorMes')
        data = []
        for result in cursor.stored_results():
            data = result.fetchall()
        conn.close()
        return data

    def obtener_pares_productos(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.callproc('ObtenerParesProductos')
        data = []
        for result in cursor.stored_results():
            data = result.fetchall()
        conn.close()
        return data
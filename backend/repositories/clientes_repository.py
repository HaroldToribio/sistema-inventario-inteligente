from backend.database.connection import DatabaseConnection


class ClientesRepository:

    def listar_clientes(self):
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ListarClientes')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data

    def crear_cliente(self, nombre, email):
        """Crea el cliente y retorna su nuevo id."""
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor()

        cursor.callproc('CrearCliente', (nombre, email))
        conn.commit()

        cursor.execute("SELECT LAST_INSERT_ID()")
        row = cursor.fetchone()
        nuevo_id = row[0] if row else None  #type: ignore

        conn.close()
        return nuevo_id

    def simular_compras(self, id_cliente, num_productos=2):
        """Genera compras simuladas para un cliente nuevo (cold-start)."""
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor()

        cursor.callproc('SimularComprasCliente', (id_cliente, num_productos))
        conn.commit()

        conn.close()

    def historial_cliente(self, id_cliente):
        """Devuelve los productos que compró un cliente."""
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('HistorialComprasCliente', (id_cliente,))

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data

    def obtener_matriz_compras(self):
        """
        Retorna todas las filas (id_cliente, id_producto, total_comprado)
        que el servicio de recomendación usa para construir la matriz.
        """
        conn = DatabaseConnection().get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('ObtenerMatrizCompras')

        data = []
        for result in cursor.stored_results():
            data = result.fetchall()

        conn.close()
        return data
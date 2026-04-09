-- =========================================
-- CREAR BASE DE DATOS
-- =========================================
CREATE DATABASE IF NOT EXISTS InventarioSimulacion;
USE InventarioSimulacion;

-- =========================================
-- TABLA PRODUCTOS
-- =========================================
CREATE TABLE productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    precio DECIMAL(10,2)
);

-- =========================================
-- TABLA VENTAS
-- =========================================
CREATE TABLE ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT,
    fecha DATE,
    cantidad INT,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- =========================================
-- INSERTAR DATOS DE PRUEBA
-- =========================================
INSERT INTO productos (nombre, categoria, precio) VALUES
('Laptop', 'Tecnologia', 1200.00),
('Mouse', 'Tecnologia', 25.50),
('Teclado', 'Tecnologia', 45.00);

INSERT INTO ventas (id_producto, fecha, cantidad) VALUES
(1, '2024-01-01', 5),
(1, '2024-01-05', 8),
(1, '2024-01-10', 6),
(2, '2024-01-02', 10),
(2, '2024-01-06', 15),
(3, '2024-01-03', 7);

-- =========================================
-- STORED PROCEDURE: OBTENER VENTAS POR PRODUCTO
-- =========================================
DELIMITER $$

CREATE PROCEDURE ObtenerVentasPorProducto(IN p_id_producto INT)
BEGIN
    SELECT 
        fecha,
        cantidad
    FROM ventas
    WHERE id_producto = p_id_producto
    ORDER BY fecha;
END$$

DELIMITER ;

-- =========================================
-- STORED PROCEDURE: LISTAR PRODUCTOS
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ListarProductos()
BEGIN
    SELECT id_producto, nombre, categoria, precio
    FROM productos
    ORDER BY nombre;
END$$
 
DELIMITER ;

-- =========================================
-- STORED PROCEDURE: INSERTAR VENTA
-- =========================================

DELIMITER $$

CREATE PROCEDURE InsertarVenta(
    IN p_id_producto INT,
    IN p_fecha DATE,
    IN p_cantidad INT
)
BEGIN
    INSERT INTO ventas (id_producto, fecha, cantidad)
    VALUES (p_id_producto, p_fecha, p_cantidad);
END$$

DELIMITER ;

-- =========================================
-- PRUEBAS
-- =========================================

-- Ver productos
CALL ListarProductos();

-- Ver ventas de un producto
CALL ObtenerVentasPorProducto(1);

-- Insertar nueva venta
CALL InsertarVenta(1, '2024-01-15', 12);

-- Ver todas las ventas
CALL ObtenerVentasTotales();

-- =========================================
-- SP: VENTAS TOTALES (todas las filas con fecha)
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ObtenerVentasTotales()
BEGIN
    SELECT
        v.id_venta,
        p.nombre,
        v.fecha,
        v.cantidad,
        ROUND(v.cantidad * p.precio, 2) AS total
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto
    ORDER BY v.fecha DESC;
END$$
 
DELIMITER ;

-- =========================================
-- SP: CREAR PRODUCTO
-- =========================================

DELIMITER $$

CREATE PROCEDURE CrearProducto(
    IN p_nombre VARCHAR(100),
    IN p_precio DECIMAL(10,2)
)
BEGIN
    INSERT INTO productos (nombre, categoria, precio)
    VALUES (p_nombre, 'General', p_precio);
END$$

DELIMITER ;

-- =========================================
-- SP: ELIMINAR PRODUCTO
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE EliminarProducto(IN p_id INT)
BEGIN
    DELETE FROM ventas    WHERE id_producto = p_id;
    DELETE FROM productos WHERE id_producto = p_id;
END$$
 
DELIMITER ;

DELIMITER $$

-- =========================================
-- SP: RESUMEN DE VENTAS (agrupado por producto)
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ObtenerResumenVentas()
BEGIN
    SELECT
        p.id_producto,
        p.nombre,
        SUM(v.cantidad * p.precio) AS total,
        SUM(v.cantidad)            AS unidades
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto
    GROUP BY p.id_producto, p.nombre
    ORDER BY total DESC;
END$$
 
DELIMITER ;

-- =========================================
-- SP: DASHBOARD RESUMEN GENERAL
-- =========================================

DELIMITER $$
 
CREATE PROCEDURE ObtenerDashboardResumen()
BEGIN
    SELECT
        COUNT(DISTINCT v.id_venta)           AS total_registros,
        ROUND(SUM(v.cantidad * p.precio), 2) AS total_ventas,
        ROUND(AVG(v.cantidad * p.precio), 2) AS promedio_ventas,
        COUNT(DISTINCT p.id_producto)        AS total_productos,
        (
            SELECT p2.nombre
            FROM ventas v2
            JOIN productos p2 ON v2.id_producto = p2.id_producto
            GROUP BY p2.id_producto
            ORDER BY SUM(v2.cantidad) DESC
            LIMIT 1
        ) AS producto_top
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto;
END$$
 
DELIMITER ;

-- =========================================
-- VERIFICACION
-- =========================================
CALL ListarProductos();
CALL ObtenerResumenVentas();
CALL ObtenerDashboardResumen();

-- =========================================
-- SP: SIMULAR VENTAS HISTÓRICAS
-- Genera ~90 días de ventas simuladas para un producto nuevo.
-- p_promedio: promedio diario estimado por el usuario
-- La cantidad por día varía ±50% del promedio (distribución uniforme)
-- para simular fluctuación real de ventas.
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE SimularVentasHistoricas(
    IN p_id_producto INT,
    IN p_promedio    INT,
    IN p_dias        INT   -- normalmente 90
)
BEGIN
    DECLARE i       INT DEFAULT 0;
    DECLARE cantidad INT;
    DECLARE fecha_venta DATE;
    DECLARE minimo  INT;
    DECLARE maximo  INT;
 
    SET minimo = GREATEST(1, ROUND(p_promedio * 0.5));
    SET maximo = ROUND(p_promedio * 1.5);
 
    WHILE i < p_dias DO
        SET fecha_venta = DATE_SUB(CURDATE(), INTERVAL (p_dias - i) DAY);
        -- Cantidad aleatoria entre minimo y maximo
        SET cantidad = minimo + FLOOR(RAND() * (maximo - minimo + 1));
 
        INSERT INTO ventas (id_producto, fecha, cantidad)
        VALUES (p_id_producto, fecha_venta, cantidad);
 
        SET i = i + 1;
    END WHILE;
END$$
 
DELIMITER ;

-- =========================================
-- MEJORA: SISTEMA DE RECOMENDACIONES
-- Filtrado Colaborativo tipo Amazon/Shein
-- =========================================

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente  INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE
);

-- Ligar ventas a clientes (columna opcional para no romper datos existentes)
ALTER TABLE ventas
    ADD COLUMN id_cliente INT NULL,
    ADD CONSTRAINT fk_ventas_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente);
        
-- ── Datos de prueba: clientes ──────────────────────────────────────
INSERT INTO clientes (nombre, email) VALUES
('Ana García',     'ana@mail.com'),
('Luis Martínez',  'luis@mail.com'),
('María López',    'maria@mail.com'),
('Carlos Pérez',   'carlos@mail.com'),
('Sofia Ramírez',  'sofia@mail.com'),
('Pedro Jiménez',  'pedro@mail.com'),
('Laura Torres',   'laura@mail.com'),
('Diego Herrera',  'diego@mail.com');

-- ── Datos de prueba: compras por cliente ──────────────────────────
-- Ana: compró Laptop + Mouse (perfil tecnología completa)
UPDATE ventas SET id_cliente = 1 WHERE id_producto = 1 AND fecha = '2024-01-01';
UPDATE ventas SET id_cliente = 1 WHERE id_producto = 2 AND fecha = '2024-01-02';
-- Luis: compró Mouse + Teclado
UPDATE ventas SET id_cliente = 2 WHERE id_producto = 2 AND fecha = '2024-01-06';
UPDATE ventas SET id_cliente = 2 WHERE id_producto = 3 AND fecha = '2024-01-03';
-- María: compró Laptop (sola)
UPDATE ventas SET id_cliente = 3 WHERE id_producto = 1 AND fecha = '2024-01-05';
-- Carlos: compró Mouse + Teclado
UPDATE ventas SET id_cliente = 4 WHERE id_producto = 2 AND fecha = '2024-01-12';
UPDATE ventas SET id_cliente = 4 WHERE id_producto = 3 AND fecha = '2024-01-09';
-- Sofia: compró Laptop + Teclado
UPDATE ventas SET id_cliente = 5 WHERE id_producto = 1 AND fecha = '2024-01-10';
UPDATE ventas SET id_cliente = 5 WHERE id_producto = 3 AND fecha = '2024-01-25';

-- =========================================
-- SP: LISTAR CLIENTES
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ListarClientes()
BEGIN
    SELECT id_cliente, nombre, email
    FROM clientes
    ORDER BY nombre;
END$$
 
DELIMITER ;

-- =========================================
-- SP: CREAR CLIENTE
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE CrearCliente(
    IN p_nombre VARCHAR(100),
    IN p_email  VARCHAR(150)
)
BEGIN
    INSERT INTO clientes (nombre, email)
    VALUES (p_nombre, p_email);
END$$
 
DELIMITER ;

-- =========================================
-- SP: HISTORIAL DE COMPRAS POR CLIENTE
-- Devuelve qué productos compró un cliente
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE HistorialComprasCliente(IN p_id_cliente INT)
BEGIN
    SELECT DISTINCT
        p.id_producto,
        p.nombre,
        p.categoria,
        p.precio,
        COUNT(v.id_venta)       AS veces_comprado,
        SUM(v.cantidad)         AS total_unidades
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto
    WHERE v.id_cliente = p_id_cliente
    GROUP BY p.id_producto, p.nombre, p.categoria, p.precio
    ORDER BY total_unidades DESC;
END$$
 
DELIMITER ;

-- =========================================
-- SP: MATRIZ CLIENTE-PRODUCTO
-- Para el filtrado colaborativo en Python
-- Devuelve todas las compras de todos los clientes
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ObtenerMatrizCompras()
BEGIN
    SELECT
        v.id_cliente,
        v.id_producto,
        SUM(v.cantidad) AS total_comprado
    FROM ventas v
    WHERE v.id_cliente IS NOT NULL
    GROUP BY v.id_cliente, v.id_producto;
END$$
 
DELIMITER ;

-- =========================================
-- SP: SIMULAR COMPRAS PARA CLIENTE NUEVO
-- Genera compras aleatorias para cold-start
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE SimularComprasCliente(
    IN p_id_cliente INT,
    IN p_num_productos INT   -- cuántos productos distintos asignarle (ej: 2)
)
BEGIN
    DECLARE i         INT DEFAULT 0;
    DECLARE pid       INT;
    DECLARE cant      INT;
    DECLARE total_p   INT;
    DECLARE fecha_c   DATE;
 
    SELECT COUNT(*) INTO total_p FROM productos;
 
    WHILE i < p_num_productos DO
        -- Producto aleatorio
        SELECT id_producto INTO pid
        FROM productos
        ORDER BY RAND()
        LIMIT 1;
 
        -- Cantidad aleatoria entre 1 y 5
        SET cant   = 1 + FLOOR(RAND() * 5);
        SET fecha_c = DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 60) DAY);
 
        -- Solo insertar si no compró ya ese producto
        IF NOT EXISTS (
            SELECT 1 FROM ventas
            WHERE id_cliente = p_id_cliente AND id_producto = pid
        ) THEN
            INSERT INTO ventas (id_producto, fecha, cantidad, id_cliente)
            VALUES (pid, fecha_c, cant, p_id_cliente);
        END IF;
 
        SET i = i + 1;
    END WHILE;
END$$
 
DELIMITER ;

-- =========================================
-- SP: VENTAS POR MES (tendencia temporal)
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ObtenerVentasPorMes()
BEGIN
    SELECT
        DATE_FORMAT(v.fecha, '%Y-%m') AS mes,
        SUM(v.cantidad)               AS total_unidades,
        ROUND(SUM(v.cantidad * p.precio), 2) AS total_ingresos
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto
    GROUP BY DATE_FORMAT(v.fecha, '%Y-%m')
    ORDER BY mes;
END$$
 
DELIMITER ;

-- =========================================
-- SP: PARES DE PRODUCTOS MAS COMPRADOS JUNTOS
-- Para el reporte de "frecuencia de compra conjunta"
-- =========================================
DELIMITER $$
 
CREATE PROCEDURE ObtenerParesProductos()
BEGIN
    SELECT
        p1.nombre  AS producto_a,
        p2.nombre  AS producto_b,
        COUNT(*)   AS veces_juntos
    FROM ventas v1
    JOIN ventas v2
        ON  v1.id_cliente  = v2.id_cliente
        AND v1.id_producto < v2.id_producto   -- evitar duplicados
    JOIN productos p1 ON v1.id_producto = p1.id_producto
    JOIN productos p2 ON v2.id_producto = p2.id_producto
    WHERE v1.id_cliente IS NOT NULL
    GROUP BY p1.nombre, p2.nombre
    ORDER BY veces_juntos DESC
    LIMIT 10;
END$$
 
DELIMITER ;
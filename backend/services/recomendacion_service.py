import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity


def construir_matriz(filas_compras: list) -> pd.DataFrame:
    if not filas_compras:
        return pd.DataFrame()

    df = pd.DataFrame(filas_compras)          # id_cliente, id_producto, total_comprado
    matriz = df.pivot_table(
        index="id_cliente",
        columns="id_producto",
        values="total_comprado",
        fill_value=0
    )
    return matriz


def recomendar_productos(
    id_cliente: int,
    matriz: pd.DataFrame,
    productos_info: dict,
    top_n: int = 3
) -> list:
    if matriz.empty or id_cliente not in matriz.index:
        return []

    # ── 1. Vector del cliente objetivo ───────────────────────────────
    vector_cliente = matriz.loc[[id_cliente]].values  # shape (1, n_productos)

    # ── 2. Similitud coseno con todos los demás clientes ─────────────
    similitudes = cosine_similarity(vector_cliente, matriz.values)[0]
    # similitudes[i] = similitud entre el cliente y matriz.index[i]

    # ── 3. Puntaje ponderado por producto ─────────────────────────────
    # Excluimos al propio cliente (similitud = 1 consigo mismo)
    idx_cliente = list(matriz.index).index(id_cliente)
    pesos = similitudes.copy()
    pesos[idx_cliente] = 0.0   # no se recomienda a sí mismo

    # Productos ya comprados por el cliente (cantidad > 0)
    ya_comprados = set(
        int(col)
        for col, val in zip(matriz.columns, matriz.loc[id_cliente])
        if val > 0      #type: ignore
    )

    # Suma ponderada: score[producto] = Σ similitud[j] * compras[j][producto]
    scores = {}
    for col_idx, id_prod in enumerate(matriz.columns):
        id_prod = int(id_prod)
        if id_prod in ya_comprados:
            continue                      # ya lo compró, no recomendar
        score = float(np.dot(pesos, matriz.iloc[:, col_idx].values))    #type: ignore
        if score > 0:
            scores[id_prod] = score

    if not scores:
        return []

    # ── 4. Ordenar y tomar top_n ──────────────────────────────────────
    top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    # ── 5. Armar respuesta con info del producto ──────────────────────
    recomendaciones = []
    for id_prod, score in top:
        info = productos_info.get(id_prod, {})

        # Identificar cuántos clientes similares compraron este producto
        compradores = int(np.sum(matriz.iloc[:, list(matriz.columns).index(id_prod)] > 0))

        recomendaciones.append({
            "id_producto": id_prod,
            "nombre":      info.get("nombre",    "Producto"),
            "precio":      float(info.get("precio", 0)),
            "categoria":   info.get("categoria", ""),
            "score":       round(score, 4),
            "razon":       f"{compradores} cliente(s) con perfil similar también lo compraron"
        })

    return recomendaciones


def recomendar_para_cliente(
    id_cliente: int,
    filas_compras: list,
    productos_lista: list,
    top_n: int = 3
) -> dict:
    if not filas_compras:
        return {"error": "No hay datos de compras suficientes para generar recomendaciones."}

    # Índice de productos para acceso rápido
    productos_info = {
        int(p["id_producto"]): {
            "nombre":    p["nombre"],
            "precio":    p["precio"],
            "categoria": p.get("categoria", "")
        }
        for p in productos_lista
    }

    matriz = construir_matriz(filas_compras)

    if id_cliente not in matriz.index:
        return {"error": "Este cliente no tiene historial de compras suficiente para generar recomendaciones."}

    recomendaciones = recomendar_productos(id_cliente, matriz, productos_info, top_n=top_n)

    # Historial del cliente (productos ya comprados con cantidad)
    historial = []
    for id_prod, cantidad in zip(matriz.columns, matriz.loc[id_cliente]):
        if cantidad > 0:    #type: ignore
            info = productos_info.get(int(id_prod), {})
            historial.append({
                "id_producto": int(id_prod),
                "nombre":      info.get("nombre", ""),
                "precio":      float(info.get("precio", 0)),
                "cantidad":    int(cantidad)    #type: ignore
            })

    return {
        "id_cliente":                 id_cliente,
        "recomendaciones":            recomendaciones,
        "historial_compras":          historial,
        "total_clientes_analizados":  int(len(matriz))
    }
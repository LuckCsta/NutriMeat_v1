from flask import Flask, render_template, jsonify, request
import json
from dataclasses import dataclass
import pandas as pd
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
from typing import Dict, List, Optional

app = Flask(__name__)


@dataclass
class InfoNutricional:
    calorias: float
    proteinas: float
    gorduras_totais: float
    gorduras_saturadas: float
    colesterol: float
    calcio: float
    ferro: float
    sodio: float
    zinco: float
    vitamina_b12: float


class NutriMeat:
    def __init__(self):
        self.carnes = self.carregar_banco_dados()

    def carregar_banco_dados(self) -> Dict[str, InfoNutricional]:
        """Carrega o banco de dados de carnes do arquivo JSON"""
        try:
            with open('dados_carnes.json', 'r', encoding='utf-8') as f:
                dados = json.load(f)
                return {nome: InfoNutricional(**info) for nome, info in dados.items()}
        except FileNotFoundError:
            return {}

    def comparar_carnes(self, carnes_selecionadas: List[str]) -> dict:
        """Realiza a comparação entre as carnes selecionadas"""
        if not carnes_selecionadas:
            return {"error": "Selecione pelo menos uma carne para comparar!"}

        resultados = {}
        nutrientes = [
            'calorias', 'proteinas', 'gorduras_totais', 'gorduras_saturadas',
            'colesterol', 'calcio', 'ferro', 'sodio', 'zinco', 'vitamina_b12'
        ]

        # Base para comparação percentual
        carne_base = carnes_selecionadas[0]

        for nutriente in nutrientes:
            resultados[nutriente] = {}
            valor_base = getattr(self.carnes[carne_base], nutriente)

            for carne in carnes_selecionadas:
                valor = getattr(self.carnes[carne], nutriente)
                if carne == carne_base:
                    diff = 0
                else:
                    diff = ((valor - valor_base) / valor_base) * 100

                resultados[nutriente][carne] = {
                    'valor': valor,
                    'diferenca': diff
                }

        return resultados

    def gerar_grafico_comparativo(self, carnes: List[str]) -> str:
        """Gera gráficos comparativos e retorna como base64"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

        # Gráfico de barras para proteínas
        proteinas = [self.carnes[carne].proteinas for carne in carnes]
        ax1.bar(carnes, proteinas)
        ax1.set_title('Comparação de Proteínas')
        ax1.set_ylabel('Proteínas (g)')
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')

        # Gráfico de barras para gorduras
        gorduras = [self.carnes[carne].gorduras_totais for carne in carnes]
        ax2.bar(carnes, gorduras)
        ax2.set_title('Comparação de Gorduras Totais')
        ax2.set_ylabel('Gorduras (g)')
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')

        plt.tight_layout()

        # Converte o gráfico para base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()

        return image_base64


nutri_meat = NutriMeat()


@app.route('/')
def index():
    return render_template('index.html', carnes=sorted(nutri_meat.carnes.keys()))


@app.route('/comparar', methods=['POST'])
def comparar():
    carnes = request.json.get('carnes', [])
    if not carnes:
        return jsonify({"error": "Selecione pelo menos uma carne!"})

    resultados = nutri_meat.comparar_carnes(carnes)
    grafico = nutri_meat.gerar_grafico_comparativo(carnes)

    return jsonify({
        "resultados": resultados,
        "grafico": grafico
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
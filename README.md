# depto-app

Aplicación web para **registrar, comparar y analizar departamentos en alquiler**, permitiendo cargar alquiler y expensas en **distintas monedas (ARS / USD)** y visualizar el **total convertido automáticamente** utilizando la cotización del **dólar blue (venta)**.

El objetivo del proyecto es ofrecer una herramienta simple para la toma de decisiones y, a la vez, servir como **proyecto de portfolio frontend** con React + TypeScript.

---

## Funcionalidades

- Autocompletado de direcciones con mapa
- Alquiler y expensas en **monedas distintas**
- Conversión automática ARS ↔ USD
- Total dinámico con toggle ARS / USD
- Persistencia en **LocalStorage**
- Eliminación individual y reset completo

---

## Tecnologías utilizadas

- **React**
- **TypeScript**
- **Vite**
- **CSS**

---

## APIs consumidas

### Geoapify (Autocomplete de direcciones)
- Usada para sugerencias de direcciones al escribir
- Referencia: [Geoapify](https://www.geoapify.com/)

### Bluelytics (Cotización del dolar)
- Usada para obtener la cotización actual del dolar
- Referencia: [Bluelytics](https://bluelytics.com.ar/#!/)


## Deployment

Para desplegar este proyecto en local

```bash
    git clone https://github.com/frncabre/depto-app.git
    cd depto-app
```
```bach
    npm install
```

Crear un archivo `.env` en la raíz del proyecto para determinar la variable de entorno:

```env
    VITE_GEOAPIFY_API_KEY=tu_geopaify_api_key
```

Ejcutar el proyecto
```bach
    npm run dev
```

## Screenshots del proyecto

![App Screenshot](https://cabrera-franco-portfolio.vercel.app/docs/dept-app-image-1.png)
![App Screenshot](https://cabrera-franco-portfolio.vercel.app/docs/dept-app-image-2.png)
![App Screenshot](https://cabrera-franco-portfolio.vercel.app/docs/dept-app-image-3.png)


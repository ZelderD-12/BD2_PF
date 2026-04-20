import { Elysia, t } from 'elysia'

const app = new Elysia()
const PORT = 8080
app.listen(PORT)
console.log(` API corriendo en http://localhost:${PORT}`)


app.get("/", () => {
    return { mensaje: "API de Saludos" }
})


app.post("/saludar", ({ body }) => {
    const { nombre, saludo = "Hola" } = body
    return { 
        mensaje: `${saludo} ${nombre} desde POST!`,
        metodo: "POST",
        recibido: body
    }
}, {
    body: t.Object({
        nombre: t.String(),
        saludo: t.Optional(t.String())
    })
})







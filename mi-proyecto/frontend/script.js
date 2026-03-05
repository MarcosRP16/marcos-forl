/* ==========================================================================
   1. ESTADO DE LA APLICACIÓN (Frontend)
   ========================================================================== */
   const API_URL = 'http://127.0.0.1:3000/api';

   // Ahora solo guardamos en el navegador la sesión activa y el carrito.
   // Los usuarios y productos viven en la base de datos de Python.
   let db = {
       sesion: JSON.parse(localStorage.getItem('sesionActiva')) || null,
       carrito: JSON.parse(localStorage.getItem('carrito')) || [],
       productosAPI: [] // Aquí guardaremos lo que nos responda Python
   };
   
   function guardarEstadoLocal() {
       localStorage.setItem('sesionActiva', JSON.stringify(db.sesion));
       localStorage.setItem('carrito', JSON.stringify(db.carrito));
   }
   
   /* ==========================================================================
      2. MOTOR DE NAVEGACIÓN (SPA)
      ========================================================================== */
   function cambiarVista(vistaId) {
       document.querySelectorAll('.vista').forEach(v => v.classList.add('d-none'));
       document.getElementById(vistaId).classList.remove('d-none');
       
       if(vistaId === 'vista-catalogo') cargarProductosDesdeBackend();
       if(vistaId === 'vista-carrito') renderizarCarrito();
       if(vistaId === 'vista-dashboard') renderizarDashboard();
   }
   
   // Botones del menú
   document.getElementById('nav-logo').addEventListener('click', () => cambiarVista('vista-catalogo'));
   document.getElementById('nav-catalogo').addEventListener('click', () => cambiarVista('vista-catalogo'));
   document.getElementById('nav-vender').addEventListener('click', () => cambiarVista('vista-vender'));
   document.getElementById('nav-dashboard').addEventListener('click', () => cambiarVista('vista-dashboard'));
   document.getElementById('nav-login').addEventListener('click', () => cambiarVista('vista-login'));
   document.getElementById('nav-carrito').addEventListener('click', () => cambiarVista('vista-carrito'));
   
   document.getElementById('link-registro').addEventListener('click', (e) => {
       e.preventDefault();
       document.getElementById('caja-login').classList.add('d-none');
       document.getElementById('caja-registro').classList.remove('d-none');
   });
   document.getElementById('link-login').addEventListener('click', (e) => {
       e.preventDefault();
       document.getElementById('caja-registro').classList.add('d-none');
       document.getElementById('caja-login').classList.remove('d-none');
   });
   
   /* ==========================================================================
      3. AUTENTICACIÓN (Conectado a Python)
      ========================================================================== */
   function actualizarUI() {
       const logueado = db.sesion !== null;
       
       document.querySelectorAll('.auth-required').forEach(el => logueado ? el.classList.remove('d-none') : el.classList.add('d-none'));
       document.querySelectorAll('.guest-only').forEach(el => logueado ? el.classList.add('d-none') : el.classList.remove('d-none'));
       
       if (logueado) {
           document.getElementById('user-info').classList.remove('d-none');
           document.getElementById('user-name').textContent = `Hola, ${db.sesion.user}`;
           document.getElementById('user-wallet').textContent = `${parseFloat(db.sesion.saldo).toFixed(2)} €`;
       } else {
           document.getElementById('user-info').classList.add('d-none');
       }
       document.getElementById('cart-count').textContent = db.carrito.length;
   }
   
   // Registro contra la API
   document.getElementById('form-registro').addEventListener('submit', async (e) => {
       e.preventDefault();
       const email = document.getElementById('reg-email').value.trim();
       const user = document.getElementById('reg-user').value.trim();
       const pass = document.getElementById('reg-pass').value;
       const passConfirm = document.getElementById('reg-pass-confirm').value; 
   
       if (!email || !user || !pass) return alert("Todos los campos son obligatorios.");
       if (pass !== passConfirm) return alert("Las contraseñas no coinciden.");
   
       try {
           const respuesta = await fetch(`${API_URL}/register`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ email, user, pass })
           });
   
           const data = await respuesta.json();
   
           if (respuesta.ok) {
               alert('Cuenta creada con éxito. Ya puedes iniciar sesión.');
               document.getElementById('form-registro').reset();
               document.getElementById('link-login').click();
           } else {
               alert(`Error: ${data.error}`);
           }
       } catch (error) {
           alert("Error de conexión con el servidor. ¿Está Python encendido?");
       }
   });
   
   // Login contra la API
   document.getElementById('form-login').addEventListener('submit', async (e) => {
       e.preventDefault();
       const loginInput = document.getElementById('login-user').value.trim(); 
       const pass = document.getElementById('login-pass').value;
   
       try {
           const respuesta = await fetch(`${API_URL}/login`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ login: loginInput, pass: pass })
           });
   
           const data = await respuesta.json();
   
           if (respuesta.ok) {
               db.sesion = data; // Guardamos los datos que nos devuelve Python
               guardarEstadoLocal();
               actualizarUI();
               cambiarVista('vista-catalogo');
               document.getElementById('form-login').reset();
           } else {
               alert(`Error: ${data.error}`);
           }
       } catch (error) {
           alert("Error de conexión con el servidor. ¿Está Python encendido?");
       }
   });
   
   document.getElementById('nav-logout').addEventListener('click', () => {
       db.sesion = null;
       guardarEstadoLocal();
       actualizarUI();
       cambiarVista('vista-catalogo');
   });
   
   // Botón de saldo simulado (En una app real esto iría contra el backend con una tarjeta)
   document.getElementById('btn-recargar').addEventListener('click', () => {
       const cantidadStr = prompt("Simulación: ¿Cuánto dinero deseas ingresar? (€)");
       if(cantidadStr !== null) {
           const cantidad = parseFloat(cantidadStr);
           if(!isNaN(cantidad) && cantidad > 0) {
               db.sesion.saldo += cantidad;
               guardarEstadoLocal();
               actualizarUI();
               alert(`Has recargado ${cantidad.toFixed(2)} € (Simulado). En el próximo inicio de sesión se reseteará porque no lo enviamos a la BD.`);
           }
       }
   });
   
   /* ==========================================================================
      4. CATÁLOGO Y CARRITO (Conectado a Python)
      ========================================================================== */
   async function cargarProductosDesdeBackend() {
       try {
           const respuesta = await fetch(`${API_URL}/productos/buscar`);
           const productos = await respuesta.json();
           db.productosAPI = productos; // Guardamos en memoria
           renderizarCatalogo(productos);
       } catch (error) {
           console.error("Error cargando productos", error);
           document.getElementById('product-grid').innerHTML = '<p class="text-danger text-center w-100">Error conectando al servidor. Revisa tu backend.</p>';
       }
   }
   
   function renderizarCatalogo(productos) {
       const grid = document.getElementById('product-grid');
       grid.innerHTML = '';
       
       if(productos.length === 0) {
           grid.innerHTML = '<p class="text-muted text-center w-100">No hay productos en la base de datos.</p>';
           return;
       }
   
       productos.forEach(prod => {
           grid.innerHTML += `
           <div class="col-12 col-sm-6 col-md-4 col-lg-3 d-flex">
                <div class="card h-100 w-100 shadow-sm">
                    <img src="${prod.img || 'https://via.placeholder.com/500x300'}" class="card-img-top" alt="${prod.nombre}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${prod.nombre}</h5>
                        <p class="card-text flex-grow-1">${prod.desc}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="fw-bold">${parseFloat(prod.precio).toFixed(2)} €</span>
                            <button class="btn btn-primary btn-sm" onclick="añadirAlCarrito(${prod.id})">Añadir</button>
                        </div>
                    </div>
                </div>
            </div>
           `;
       });
   }
   
   window.añadirAlCarrito = function(id) {
       if (!db.sesion) {
           alert('Debes iniciar sesión para comprar');
           cambiarVista('vista-login');
           return;
       }
       const producto = db.productosAPI.find(p => p.id === id);
       if (producto) {
           db.carrito.push({ ...producto, cartId: Date.now() }); 
           guardarEstadoLocal();
           actualizarUI();
       }
   }
   
   function renderizarCarrito() {
       const lista = document.getElementById('items-carrito');
       lista.innerHTML = '';
       let total = 0;
       
       if (db.carrito.length === 0) {
           lista.innerHTML = '<li class="list-group-item text-center text-muted p-5">Tu cesta está vacía</li>';
       } else {
           db.carrito.forEach(item => {
               total += parseFloat(item.precio);
               lista.innerHTML += `
                   <li class="cart-item">
                       <div class="cart-item-thumb">
                           <img src="${item.img}" alt="img">
                       </div>
                       <div class="cart-item-info">
                           <h6 class="cart-item-name">${item.nombre}</h6>
                           <small class="text-muted">Vendido por: ${item.vendedor}</small>
                       </div>
                       <div class="d-flex align-items-center gap-4">
                           <span class="cart-item-price fw-bold">${parseFloat(item.precio).toFixed(2)} €</span>
                           <button class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${item.cartId})">Eliminar</button>
                       </div>
                   </li>
               `;
           });
       }
       document.getElementById('total-carrito').textContent = `${total.toFixed(2)} €`;
   }
   
   window.eliminarDelCarrito = function(cartId) {
       db.carrito = db.carrito.filter(item => item.cartId !== cartId);
       guardarEstadoLocal();
       renderizarCarrito();
       actualizarUI();
   }
   
   // Checkout contra la API (AQUÍ ESTÁ LA VULNERABILIDAD QUE DEBES AUDITAR LUEGO)
   document.getElementById('btn-checkout').addEventListener('click', async () => {
       if (db.carrito.length === 0) return alert('La cesta está vacía');
       
       const total = db.carrito.reduce((sum, item) => sum + parseFloat(item.precio), 0);
       
       if (db.sesion.saldo >= total) {
           try {
               const respuesta = await fetch(`${API_URL}/comprar`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                       comprador: db.sesion.user,
                       total: total, // ⚠️ El frontend le dicta el precio al backend.
                       items: db.carrito
                   })
               });
   
               const data = await respuesta.json();
   
               if (respuesta.ok) {
                   db.sesion.saldo = data.nuevo_saldo;
                   db.carrito = [];
                   guardarEstadoLocal();
                   actualizarUI();
                   cambiarVista('vista-dashboard');
                   alert('¡Pedido procesado en la Base de Datos!');
               } else {
                   alert(`Error al comprar: ${data.error}`);
               }
           } catch (error) {
               alert("Error conectando con el servidor para tramitar el pedido.");
           }
       } else {
           alert('Fondos insuficientes. Necesitas recargar tu saldo.');
       }
   });
   
   /* ==========================================================================
      5. VENDER PRODUCTOS (DASHBOARD)
      ========================================================================== */
   document.getElementById('form-crear-producto').addEventListener('submit', async (e) => {
       e.preventDefault();
       
       const nuevoProducto = {
           vendedor: db.sesion.user, // ⚠️ Vulnerabilidad IDOR en backend: Confía ciegamente en este campo.
           nombre: document.getElementById('prod-nombre').value.trim(),
           desc: document.getElementById('prod-desc').value.trim(),
           precio: parseFloat(document.getElementById('prod-precio').value),
           img: document.getElementById('prod-img').value || 'https://via.placeholder.com/800x600'
       };
       
       if(!nuevoProducto.nombre || !nuevoProducto.desc || isNaN(nuevoProducto.precio) || nuevoProducto.precio <= 0) {
           return alert("Por favor, rellena los campos correctamente.");
       }
   
       try {
           const respuesta = await fetch(`${API_URL}/productos`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(nuevoProducto)
           });
   
           if (respuesta.ok) {
               alert('Anuncio publicado en la Base de Datos correctamente');
               document.getElementById('form-crear-producto').reset();
               cargarProductosDesdeBackend(); // Recargamos para ver el nuevo
               cambiarVista('vista-catalogo');
           } else {
               alert("Error publicando el producto.");
           }
       } catch (error) {
           alert("Error de conexión con el servidor.");
       }
   });
   
   function renderizarDashboard() {
       // Filtramos los productos que ha devuelto Python para mostrar solo los nuestros
       const misProductos = db.productosAPI.filter(p => p.vendedor === db.sesion.user);
       const listaProd = document.getElementById('lista-mis-productos');
       
       listaProd.innerHTML = misProductos.length === 0 ? '<li class="list-group-item text-muted p-4">No tienes anuncios activos.</li>' : '';
       misProductos.forEach(p => {
           listaProd.innerHTML += `
               <li class="list-group-item d-flex justify-content-between align-items-center p-3">
                   <div>
                       <span class="d-block fw-bold">${p.nombre}</span>
                       <span class="text-success">${parseFloat(p.precio).toFixed(2)} €</span>
                   </div>
               </li>`;
       });
   
       const listaCompras = document.getElementById('lista-mis-compras');
       listaCompras.innerHTML = '<li class="list-group-item text-muted p-4">Las compras ahora se guardan en el servidor SQLite de Python de forma segura.</li>';
   }
   
   // INICIALIZACIÓN
   window.onload = () => {
       actualizarUI();
       cargarProductosDesdeBackend(); // Inicia pidiendo datos a Python
   };
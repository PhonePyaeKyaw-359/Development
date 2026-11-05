# Fieldwork Store

A static storefront and admin prototype powered by DummyJSON. The customer shop, product CRUD dashboard, and purchase activity page each have their own folder and HTML, CSS, and JavaScript files.

## Project structure

- `shop/` — customer storefront, DummyJSON sign-in, shopping bag, and demo checkout (`index.html`, `shop.css`, `shop.js`)
- `admin/` — product management dashboard (`index.html`, `admin.css`, `admin.js`)
- `admin/purchases/` — customer purchase activity view (`index.html`, `purchases.css`, `purchases.js`)
- Root `index.html` forwards visitors to the storefront.

## Run locally

Serve the project folder over HTTP. In VS Code, open the root `index.html` with Live Server. From the app navigation, customers go to **Shop**; administrators can open **Products** or **Purchases**. Do not open files as `file://` URLs because browsers can block API requests. An internet connection is needed for DummyJSON products and images.

## DummyJSON endpoints

- Product catalog: `GET https://dummyjson.com/products?limit=0`
- Create, update, delete products (admin): `POST /products/add`, `PUT /products/{id}`, `DELETE /products/{id}`
- Customer sign-in (shop): `POST https://dummyjson.com/auth/login`; verify current session with `GET https://dummyjson.com/auth/me`
- Demo checkout (shop): `POST https://dummyjson.com/carts/add` with the signed-in user's ID and product quantities
- Purchase activity (admin): `GET https://dummyjson.com/carts?limit=0`
- Customer details for carts: `GET https://dummyjson.com/users?limit=0`

The Purchases page joins each cart's `userId` to the DummyJSON users list and displays the customer and purchased products. The shop signs customers in through DummyJSON Auth; a **Use demo login** button fills the public example account from the [DummyJSON auth docs](https://dummyjson.com/docs/auth). Checkout verifies that user and submits the user's ID and product quantities to DummyJSON Carts. DummyJSON's cart, product, and checkout writes are simulated; the shared API data does not change. The admin overlays product edits in browser local storage, and the shop stores the bag and demo order locally. The Purchases page can read demo orders from the same browser and site origin, while its API sample carts are shared test data. Local data is not shared across visitors or devices. No payment is collected.

## Deploy

This is a static site with no build step. Deploy the project folder as the site root. The host should serve the root `index.html` and each folder's `index.html` directly.

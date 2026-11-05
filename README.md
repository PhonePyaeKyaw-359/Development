# Fieldwork Store

A responsive two-sided storefront prototype powered by DummyJSON. Customers browse the shop, add products to a bag, and submit a demo checkout. Admins manage the catalog from the separate admin page.

## Pages

- `shop.html` — customer storefront, bag, and demo checkout
- `index.html` — admin product catalog with create, read, update, and delete controls

## Run locally

Serve this folder over HTTP. In VS Code, right-click `shop.html` or `index.html` and choose **Open with Live Server**. Do not open a page as a `file://` URL; browsers can block its API requests. An internet connection is needed for DummyJSON products and images.

## DummyJSON endpoints

- Product catalog: `GET https://dummyjson.com/products?limit=0`
- Create product (admin): `POST https://dummyjson.com/products/add`
- Update product (admin): `PUT https://dummyjson.com/products/{id}`
- Delete product (admin): `DELETE https://dummyjson.com/products/{id}`
- Submit demo bag (shop): `POST https://dummyjson.com/carts/add`

DummyJSON simulates add, update, delete, and cart writes; it does not save them to its shared server data. Admin changes are overlaid in browser local storage, the shop bag is stored in local storage, and demo order summaries are stored in local storage. They are only available in the browser that created them. Checkout sends product IDs and quantities to DummyJSON's mock cart endpoint; the name and email entered in the demo checkout form are only used for form validation and are not transmitted or saved. No payment is collected.

## Deploy

This is a static site with no build step. Deploy the project folder as the site root. Both `index.html` and `shop.html` are standalone static pages, so the hosting platform should serve each file directly.

# Form & Field Product Catalog

A responsive product catalog powered by the [DummyJSON Products API](https://dummyjson.com/docs/products). The app is a static site built with HTML, CSS, and JavaScript, so it can be deployed directly to Vercel without a build step.

## Run locally

Serve this folder over HTTP; do not open `index.html` as a `file://` URL because browsers can block API requests from local files. In VS Code, right-click `index.html` and choose **Open with Live Server**. The browser needs an internet connection to load products and images from DummyJSON.

## Deploy with Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Keep the project root as the Root Directory. Choose **Other** if Vercel asks for a framework; leave the Build Command empty and use `.` as the Output Directory.
4. Deploy. Vercel will provide a public URL, and future pushes to the connected branch will publish updates.

## Product changes

The app loads the complete catalog from `GET https://dummyjson.com/products?limit=0` and uses DummyJSON's `POST /products/add`, `PUT /products/{id}`, and `DELETE /products/{id}` endpoints for create, update, and delete. DummyJSON simulates writes and does not change its shared server data. This app stores the resulting changes in the current browser's local storage so they remain visible there after refresh. They are not shared with other visitors or devices.

# Form & Field Product Catalog

A responsive product catalog powered by the [DummyJSON Products API](https://dummyjson.com/docs/products). The app is a static site built with HTML, CSS, and JavaScript, so it can be deployed directly to Vercel without a build step.

## Run locally

Open `index.html` in a browser, or serve this folder with any static file server. The browser needs an internet connection to load the catalog and product images.

## Deploy with Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Keep the project root as the Root Directory. Choose **Other** if Vercel asks for a framework; leave the Build Command empty and use `.` as the Output Directory.
4. Deploy. Vercel will provide a public URL, and future pushes to the connected branch will publish updates.

## Product changes

The app calls DummyJSON's POST, PUT, and DELETE product endpoints. DummyJSON simulates these writes and does not change its shared server data. To make catalog edits visible on the same browser after refresh, this app saves them in that browser's local storage. They are not shared with other visitors or devices.

# Blaze - Ultrafast Search Engine for Minimalist Browsing

Blaze is an ultrafast search engine designed to minimize data transfer between clients and servers, enabling users to browse the web in a minimalist manner. This repository contains the core code for the Blaze search engine and lightweight page rendering.

## Features

- **Minimalist Search**: Blaze aims to reduce the transferred data between clients and servers, providing a minimalist search experience.
- **Lightweight Page Rendering**: When a search result is clicked, Blaze generates a lightweight version of the web page using Readability library, allowing for quick loading even under challenging connection conditions.
- **Open Source**: The code for Blaze is open source and available on GitHub. You can host your own version of Blaze or contribute to its development.

## How It Works

Blaze utilizes the following technologies and frameworks:

- **Express**: A fast, unopinionated web framework for Node.js, used to handle server-side requests and responses.
- **@mozilla/readability**: A library for extracting the main content of a web page, enabling the generation of lightweight pages for search results.
- **JSDOM**: A JavaScript implementation of the W3C DOM, used to parse and manipulate HTML documents in a virtual environment.
- **Got**: A lightweight HTTP client for making requests to external APIs.

The core functionality of Blaze can be summarized as follows:

1. The user initiates a search query through the Blaze web interface.
2. The query is sent to the Brave Search API to retrieve search results.
3. The received results are processed to generate a minimalist HTML page with clickable links.
4. When a search result link is clicked, the corresponding web page is fetched.
5. The fetched web page is parsed using Readability to extract the main content.
6. The extracted content is displayed as a lightweight page to the user.

## Implications and Benefits

Blaze addresses the issue of slow internet connections and enables seamless browsing even in challenging conditions. By minimizing the transferred data, Blaze offers several benefits:

1. **Faster Browsing**: With Blaze, users can search for information and load pages extremely quickly, even with poor internet connections.
2. **Reduced Bandwidth Consumption**: Blaze significantly reduces the amount of data transferred between clients and servers, resulting in lower bandwidth consumption.
3. **Battery and Processor Efficiency**: Browsing lightweight and minimalist web pages puts less stress on the phone's battery and processor, leading to improved device efficiency.
4. **Ad-Free Experience**: Blaze pages are mostly free from ads, enhancing the browsing experience and reducing distractions.
5. **Environmental Impact**: Blaze's minimal data transfer approach can contribute to environmental sustainability by reducing battery drain, decreasing the need for frequent phone charging, and potentially lowering CO2 emissions.

## Getting Started

To run your own instance of Blaze or contribute to the project, follow these steps:

1. Clone the repository: `git clone https://github.com/daaanny90/blaze-this-page.git`
2. Install the dependencies: `npm install`
3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add your Brave Search key as `CYCLIC_BRAVE_KEY` in the `.env` file.
4. Start the server: `npm start`
5. Access Blaze in your browser at `http://localhost:8888`

Please note that you need to obtain a Brave Search key to use Blaze effectively. Visit the [Brave Search website](https://search.brave.com) for more information.

## Contributing

Contributions to Blaze are welcome! Feel free to open issues or submit pull requests on the GitHub repository. Please follow the existing code style and provide clear descriptions of your changes.

## License

This project is licensed under the [MIT License](LICENSE).

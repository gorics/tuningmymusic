const routes = new Map();
let mountNode;
let currentPath = "/";

export function initRouter(node) {
  mountNode = node;
  window.addEventListener("hashchange", () => handleRoute(location.hash));
  handleRoute(location.hash || "#/");
}

export function registerRoute(path, render) {
  routes.set(path, render);
}

function handleRoute(hash) {
  const [path, search] = hash.split("?");
  const render = routes.get(path.replace(/^#/, "")) || routes.get("/");
  if (!render) return;
  const params = new URLSearchParams(search);
  const element = render({ params, path: path.replace(/^#/, "") });
  if (mountNode) {
    mountNode.innerHTML = "";
    if (element instanceof Node) {
      mountNode.appendChild(element);
      mountNode.focus();
    }
  }
  updateNav(path);
  currentPath = path.replace(/^#/, "");
}

function updateNav(path) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.setAttribute("aria-current", link.getAttribute("href") === path ? "page" : "false");
  });
}

export function rerender() {
  handleRoute(`#${currentPath}`);
}

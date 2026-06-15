import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { initPaymentTracker } from "./paymentTracker.jsx";

function updateHousingFeesBlock() {
  const feesBox = document.querySelector(".fees-box");
  if (!feesBox) return false;

  const paragraph = feesBox.querySelector("p:not(.eyebrow)");
  if (paragraph) {
    paragraph.innerHTML = paragraph.innerHTML
      .replace("on s’en occupe", "c’est pour nous ;)")
      .replace("on s'en occupe", "c’est pour nous ;)");
  }

  const links = Array.from(feesBox.querySelectorAll(".fees-actions a"));

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const label = (link.textContent || "").toLowerCase();

    if (href.includes("weropay") || label.includes("wero")) {
      link.remove();
      return;
    }

    if (href.includes("revolut") || label.includes("revolut")) {
      link.textContent = "Payer en ligne";
    }
  });

  return true;
}

function keepHousingFeesBlockUpdated() {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const updated = updateHousingFeesBlock();

    if (updated || attempts >= 80) {
      window.clearInterval(timer);
    }
  }, 250);

  window.addEventListener("load", updateHousingFeesBlock, { once: true });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initPaymentTracker();
keepHousingFeesBlockUpdated();

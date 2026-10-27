from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.goto("http://127.0.0.1:3001", wait_until="networkidle")
    assert page.locator("body").inner_text().strip(), "La aplicación no renderizó contenido"
    assert page.locator("text=Atent").count() > 0, "La pantalla inicial no muestra Atent"
    page.screenshot(path="docs/screenshots/location-refresh-build.png", full_page=True)
    assert not errors, f"Errores de consola: {errors}"
    browser.close()

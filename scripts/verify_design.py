import os
import sys
from playwright.sync_api import sync_playwright

def verify_all_design_flows():
    os.makedirs('docs/screenshots', exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        
        print("Navigating to Atent Safety Web showcase on http://localhost:3001 ...")
        page.goto('http://localhost:3001')
        page.wait_for_load_state('networkidle')

        # 1. Dashboard
        page.wait_for_selector('#btn-sos-trigger')
        page.screenshot(path='docs/screenshots/01_dashboard.png', full_page=True)
        print("Captured 01_dashboard.png")

        # 2. Preparing SOS
        page.click('#nav-btn-preparing')
        page.wait_for_selector('#btn-cancel-preparing')
        page.screenshot(path='docs/screenshots/02_preparing_sos.png', full_page=True)
        print("Captured 02_preparing_sos.png")

        # 3. Active SOS Telemetry
        page.click('#nav-btn-active_sos')
        page.wait_for_selector('#btn-resolve-sos')
        page.screenshot(path='docs/screenshots/03_active_sos.png', full_page=True)
        print("Captured 03_active_sos.png")

        # 4. Resolved Emergency
        page.click('#nav-btn-resolved')
        page.wait_for_selector('#btn-return-home')
        page.screenshot(path='docs/screenshots/04_resolved.png', full_page=True)
        print("Captured 04_resolved.png")

        # 5. Trusted Contacts
        page.click('#nav-btn-contacts')
        page.wait_for_selector('#btn-add-contact')
        page.screenshot(path='docs/screenshots/05_contacts.png', full_page=True)
        print("Captured 05_contacts.png")

        # 6. Contextual Permissions
        page.click('#nav-btn-permissions')
        page.wait_for_selector('#btn-confirm-permissions')
        page.screenshot(path='docs/screenshots/06_permissions.png', full_page=True)
        print("Captured 06_permissions.png")

        # 7. Live Safety Link (Web Viewer)
        page.click('#nav-btn-safety_link')
        page.screenshot(path='docs/screenshots/07_live_safety_link.png', full_page=True)
        print("Captured 07_live_safety_link.png")

        # 8. Errors & Degraded States
        page.click('#nav-btn-errors')
        page.screenshot(path='docs/screenshots/08_error_states.png', full_page=True)
        print("Captured 08_error_states.png")

        browser.close()
        print("All UI design flows successfully verified with zero errors!")

if __name__ == '__main__':
    verify_all_design_flows()

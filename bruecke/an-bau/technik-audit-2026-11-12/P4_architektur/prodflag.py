import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); 
        for host in ("localhost","127.0.0.2"):
            pg=await (await b.new_context()).new_page()
            await pg.goto(f"http://{host}:8804/index.html"); await pg.wait_for_timeout(1500)
            print(host, await pg.evaluate("typeof window.__gastrocalc"))
        await b.close()
asyncio.run(main())

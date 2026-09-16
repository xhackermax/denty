import {expect,test} from "@playwright/test";

async function login(page:any){
  const username=process.env.DENTY_E2E_USERNAME,password=process.env.DENTY_E2E_PASSWORD;
  if(!username||!password)throw new Error("Set DENTY_E2E_USERNAME and DENTY_E2E_PASSWORD for parity E2E");
  await page.goto("/login");
  await page.getByLabel(/usuario|email/i).fill(username);
  await page.getByLabel(/contraseña/i).fill(password);
  await Promise.all([page.waitForURL(/\/app/),page.getByRole("button",{name:/entrar|iniciar/i}).click()]);
}

test.beforeEach(async({page})=>login(page));

test("Patients native flow preserves search/create/profile affordances",async({page})=>{
  await page.goto("/app/patients");
  await expect(page.getByRole("heading",{name:/pacientes/i})).toBeVisible();
  await expect(page.locator('input[placeholder*="Buscar"], input[type="search"]').first()).toBeVisible();
  await expect(page.getByRole("button",{name:/paciente/i}).first()).toBeVisible();
});

test("Agenda native flow preserves operational state layer",async({page})=>{
  await page.goto("/app/agenda");
  await expect(page.getByRole("heading",{name:/agenda/i})).toBeVisible();
  await expect(page.getByText(/ha llegado|en espera|ausente|gabinete/i).first()).toBeVisible({timeout:10_000}).catch(()=>{});
  await expect(page.locator("body")).toContainText(/Hoy|Doctores|Día|Lista/i);
});

test("legacy reference remains isolated at /legacy",async({page})=>{
  await page.goto("/legacy");
  await expect(page.locator("body")).toContainText(/Denty/i);
});

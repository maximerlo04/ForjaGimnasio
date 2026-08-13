const hamburguesa = document.getElementById('hamburguer')
const menu = document.querySelector(".nav__list")
const nav = document.querySelector(".nav")

hamburguesa.addEventListener("click",()=>{
    menu.classList.toggle('active')
    nav.classList.toggle('menu-open')
})
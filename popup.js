const github = document.querySelector(".ri-github-fill");
const linkedin = document.querySelector(".ri-linkedin-box-fill");
const mail = document.querySelector(".ri-mail-fill");

github.addEventListener("click", () => {
    window.open("https://github.com/ahmadsh2007/LeekCF-Ratings", '_blank').focus();
})

linkedin.addEventListener("click", () => {
    window.open("https://www.linkedin.com/in/ahmadshatnawi", '_blank').focus();
})

mail.addEventListener("click", () => {
    window.open("mailto:shatnawiahmad07@gmail.com", '_blank').focus();
})
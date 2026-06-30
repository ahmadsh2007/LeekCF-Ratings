document.addEventListener("DOMContentLoaded", () => {
    const socialLinks = {
        ".ri-github-fill": "https://github.com/ahmadsh2007/LeekCF-Ratings",
        ".ri-linkedin-box-fill": "https://www.linkedin.com/in/ahmadshatnawi",
        ".ri-mail-fill": "mailto:shatnawiahmad07@gmail.com"
    };

    for (const [selector, url] of Object.entries(socialLinks)) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener("click", () => {
                window.open(url, '_blank').focus();
            });
        }
    }
});
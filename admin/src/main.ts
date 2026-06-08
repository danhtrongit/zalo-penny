import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "@fontsource-variable/manrope";
import "@fontsource-variable/montserrat";
import "./styles/global.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

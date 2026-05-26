import DefaultTheme from 'vitepress/theme'
import PostList from './components/PostList.vue'
import HomeHero from './components/HomeHero.vue'
import PageHeader from './components/PageHeader.vue'
import PostCount from './components/PostCount.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PostList', PostList)
    app.component('HomeHero', HomeHero)
    app.component('PageHeader', PageHeader)
    app.component('PostCount', PostCount)
  },
}

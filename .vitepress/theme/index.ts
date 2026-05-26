import DefaultTheme from 'vitepress/theme'
import PostList from './components/PostList.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PostList', PostList)
  },
}

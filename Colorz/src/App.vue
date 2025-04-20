<script setup>
import { RouterView } from 'vue-router';
</script>

<template>
  <main>
    <router-view></router-view>
  </main>
  
  <footer>
    <p>© 2023 Color Matching Game</p>
  </footer>
</template>

<style scoped>
main {
  padding: 20px;
  min-height: 90vh;
}

footer {
  margin-top: 40px;
  border-top: 1px solid #eee;
  padding: 20px;
  text-align: center;
  color: #666;
}
</style>

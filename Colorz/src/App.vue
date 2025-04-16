<script setup>
import SocketTest from './components/SocketTest.vue';
import ColorGame from './components/ColorGame.vue';
</script>

<template>
  <main>
    <ColorGame />
  </main>
  
  <footer>
    <SocketTest />
  </footer>
</template>

<style scoped>
header {
  background-color: #f5f5f5;
  padding: 20px;
  text-align: center;
}

main {
  padding: 20px;
}

footer {
  margin-top: 40px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}
</style>

<template>
  <div class="brand-background" aria-hidden="true">
    <div class="brand-glow brand-glow-cyan" />
    <div class="brand-glow brand-glow-violet" />
    <img src="/icon.svg" alt="" class="brand-mark" />
  </div>
</template>

<style scoped>
.brand-background {
  position: absolute;
  z-index: -10;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.brand-glow {
  position: absolute;
  width: 32rem;
  height: 32rem;
  border-radius: 9999px;
  filter: blur(110px);
  opacity: 0.18;
}

.brand-glow-cyan {
  top: -16rem;
  left: calc(50% - 26rem);
  background: #22d3ee;
}

.brand-glow-violet {
  top: -12rem;
  right: calc(50% - 26rem);
  background: #a78bfa;
}

.brand-mark {
  position: absolute;
  top: 1.5rem;
  left: 50%;
  width: clamp(5rem, 9vw, 7rem);
  border-radius: 1.5rem;
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 8%),
    0 1.5rem 5rem rgb(34 211 238 / 18%),
    0 1.5rem 5rem rgb(167 139 250 / 14%);
  transform: translateX(-50%);
}

@media (max-width: 640px) {
  .brand-mark {
    top: 1rem;
    width: 4.5rem;
    border-radius: 1.15rem;
  }
}

.light .brand-glow {
  opacity: 0.24;
}
</style>

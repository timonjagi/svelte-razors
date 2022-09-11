<script>
  import globalStore from '../../stores/globalStore';
  import cartStore from '../../stores/cart';
  $: total = $cartStore.reduce((total, item) => {
    total += item.amount;
    return total;
  }, 0);
  let toggleCart = globalStore.toggleItem;
</script>

<div class="btn-cart-container">
  <button
    ckass="btn-cart-toggle"
    on:click={() => {
      toggleCart('cart', true);
    }}
  >
    <i class="fas fa-cart-plus" />
  </button>
  <span class="btn-cart-items">{total}</span>
</div>

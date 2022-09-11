<script>
  import globalStore from '../../stores/globalStore';
  import { fly, fade, blur } from 'svelte/transition';
  import { link } from 'svelte-routing';

  //item list
  import CartItems from './CartItems.svelte';
  import user from '../../stores/user';

  let closeCart = globalStore.toggleItem;
</script>

<div class="cart-overlay" transition:blur>
  <div class="cart-container" transition:fly={{ x: 100 }}>
    <div class="cart" transition:fade={{ delay: 400 }}>
      <div class="cart-header">
        <button
          class="btn btn-close"
          on:click={() => {
            closeCart('cart', false);
          }}
        >
          <i class="fas fa-window-close" />
        </button>

        <h2 class="cart-title">your bag</h2>
        <span />
      </div>

      <CartItems />

      <div class="cart-footer">
        {#if $user.jwt}
          <a
            href="/checkout"
            use:link
            class="btn btn-primary btn-block"
            on:click={() => {
              closeCart('cart', false);
            }}>checkout</a
          >
        {:else}
          in order to checkout please <a
            href="/login"
            use:link
            on:click={() => {
              closeCart('cart', false);
            }}
          >
            login</a
          >
        {/if}
      </div>
    </div>
  </div>
</div>

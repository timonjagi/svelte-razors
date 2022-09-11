<script>
  export let id;
  export let location;

  import { addToCart } from '../stores/cart';
  import products from '../stores/defaultProducts';
  import globalStore from '../stores/globalStore';
  import Loading from '../components/Loading.svelte';
  import { link } from 'svelte-routing';
  $: product = $products.find((prod) => prod.id === parseInt(id));
</script>

<svelte:head>
  <title>{!product ? 'singleproduct' : product.title}</title>
</svelte:head>

{#if product}
  <section class="single-product">
    <a href="/products" use:link class="btn btn-primary">back to products</a>

    <div class="single-product-container">
      <article class="single-product-image">
        <img src={product.image} alt={product.title} />
      </article>
      <article>
        <h1>{product.title}</h1>
        <h2>${product.price}</h2>
        <p>{product.description}</p>
        <button
          class="btn btn-primary btn-block"
          on:click={() => {
            console.log('add oto cart');
            addToCart(product);
            globalStore.toggleItem('cart', true);
          }}>add to cart</button
        >
      </article>
    </div>
  </section>
{:else}
  <Loading />
{/if}

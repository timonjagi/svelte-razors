<script>
  import Products from './Products.svelte';
  import { link } from 'svelte-routing';
  export let product;
  let { title, image, price, id } = product;
</script>

<article class="product">
  <div class="img-container">
    <img src={image} alt={title} />
    <a href="/products/{id}" class="btn btn-primary product-link">Details</a>
  </div>
  <div class="product-footer">
    <p class="product-title">{title}</p>
    <p class="product-price">${price}</p>
  </div>
</article>

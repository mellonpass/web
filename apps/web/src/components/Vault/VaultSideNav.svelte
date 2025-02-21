<script lang="ts">
    import { categoryFilter } from "$lib/stores";
    import { CipherCategory } from "$lib/types";

</script>

<div class="x-sidenav-container">
    { /* @ts-ignore */ null }
    <ul class="uk-nav-default" uk-nav>
        { /* @ts-ignore */ null }
        <li class:x-selected={$categoryFilter==CipherCategory.All} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.All; }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: thumbnails"></span> All Items</a></li>
        { /* @ts-ignore */ null }
        <li class:x-selected={$categoryFilter==CipherCategory.FAVORITES} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.FAVORITES }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: star"></span> Favorites</a></li>
        <div class="uk-margin-bottom"></div>
        <!-- Categories -->
        <li>
            { /* @ts-ignore */ null }
            <ul class="uk-nav-default" uk-nav>
                <li class="uk-parent uk-open">
                    { /* @ts-ignore */ null }
                    <a href class="uk-text-small x-nav-subheader">CATEGORIES <span uk-nav-parent-icon></span></a>
                    <ul class="uk-nav-sub uk-padding-remove">
                        { /* @ts-ignore */ null }
                        <li class:x-selected={$categoryFilter==CipherCategory.LOGINS} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.LOGINS }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: sign-in"> </span>Logins</a></li>
                        { /* @ts-ignore */ null }
                        <li class:x-selected={$categoryFilter==CipherCategory.SECURE_NOTES} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.SECURE_NOTES }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: file-text"> </span>Secure Notes</a></li>
                    </ul>
                </li>
            </ul>
        </li>
        <div class="uk-margin-bottom"></div>
        <!-- Tags -->
        <!-- Uncomment when tags are available in the BE. -->
        <!-- <li>
            <div class="uk-margin">
                <ul class="uk-nav-default" uk-nav>
                    <li class="uk-parent">
                        <a href class="uk-text-small uk-text-bold">Tags <span uk-nav-parent-icon></span></a>
                        <ul class="uk-nav-sub">
                            // add tag list here
                        </ul>
                    </li>
                </ul>
            </div>
        </li> -->
        <!-- Others -->
        { /* @ts-ignore */ null }
        <li class:x-selected={$categoryFilter==CipherCategory.ARCHIVES} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.ARCHIVES }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: album"></span> Archives</a></li>
        { /* @ts-ignore */ null }
        <li class:x-selected={$categoryFilter==CipherCategory.RECENTLY_DELETED} class="x-sidenav-item uk-border-rounded"><a href onclick={() => { $categoryFilter=CipherCategory.RECENTLY_DELETED }} class="uk-text-small"><span class="uk-margin-small-right" uk-icon="icon: trash"></span> Recently Deleted</a></li>
    </ul>
</div>


<style>
    .x-sidenav-container {
        padding: 8px;
    }
    .x-sidenav-container a {
        color: #424242;
    }

    .x-sidenav-item {
        padding: 2px 5px 2px 10px;
    }

    .x-nav-subheader {
        font-weight: 500;
        font-size: small;
    }

    .x-selected {
        background-color: #d6dce8;
    }

</style>
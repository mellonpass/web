<script>
    export let search = null;

    import gravatar from 'gravatar';
    const whoami = JSON.parse(localStorage.getItem("whoami"));

    let gravatar_url = gravatar.url(whoami.identity, {s: '100', r: 'pg', d: 'retro'});
</script>

<nav class="x-uk-navbar-container uk-navbar-container uk-navbar-transparent">
    <div class="uk-container">
        <div uk-navbar>

            <div class="uk-navbar-left" style="width: 90%;">
                <ul class="uk-navbar-nav uk-width-1-1">
                    <li class="uk-width-1-1">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input name="search" bind:value={search} class="uk-input uk-text-small uk-border-pill" type="text" placeholder="Search vault" aria-label="Input" autocomplete="off" style="height: 35px;">
                    </li>
                </ul>
            </div>
            <div class="uk-navbar-right uk-margin-left">
                <ul class="uk-navbar-nav">
                    <li class="x-vertical-center">
                        <a href uk-icon="plus" aria-label="add vault item"></a>
                        <div class="uk-navbar-dropdown">
                            <ul class="uk-nav uk-navbar-dropdown-nav">
                                <li class="uk-text-default"><a href><span class="uk-margin-small-right" uk-icon="sign-in"></span>Login</a></li>
                                <li class="uk-text-default"><a href><span class="uk-margin-small-right" uk-icon="file-text"></span>Secure note</a></li>
                            </ul>
                        </div>
                    </li>
                    <li class="x-vertical-center">
                        <div style="cursor: pointer;" class="uk-padding-small">
                            <img alt="gravatar" class="uk-border-circle" src={gravatar_url} width="40" height="40">
                        </div>
                        <div class="uk-navbar-dropdown dropdown-width-custom">
                            <ul class="uk-nav uk-navbar-dropdown-nav">
                                <li>
                                    <div class="uk-grid-small uk-flex-middle" uk-grid>
                                        <div class="uk-width-auto">
                                            <img alt="gravatar" class="uk-border-circle" src={gravatar_url} width="40" height="40">
                                        </div>
                                        <div class="uk-width-expand">
                                            <span class="uk-text-default">Logged in as</span>
                                            <span class="uk-text-light">{whoami.identity}</span>
                                        </div>
                                    </div>
                                </li>
                                <hr>
                                <li class="uk-text-default"><a href><span class="uk-margin-small-right" uk-icon="sign-out"></span>Logout</a></li>
                                <li class="uk-text-default"><a href><span class="uk-margin-small-right" uk-icon="lock"></span>Lock now</a></li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>


<style>
    /* override navbar dropdown width */
    .dropdown-width-custom:not(.uk-drop-stack) {
        width: 300px;
    }

    .x-vertical-center {
        display: inline-flex;
        align-items: center;
    }

    .x-uk-navbar-container {
        border-bottom: solid #f5f5f5;
    }
</style>

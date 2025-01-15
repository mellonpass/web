<script>
    import gravatar from 'gravatar';
    const whoami = JSON.parse(localStorage.getItem("whoami"));

    let gravatar_url = gravatar.url(whoami.identity, {s: '100', r: 'pg', d: 'retro'});
</script>

<nav class="uk-navbar-container">
    <div class="uk-container uk-container-xlarge">
        <div uk-navbar="align: center; mode: click;">

            <div class="uk-navbar-center" style="width: 50%;">
                <div class="uk-navbar-item uk-width-1-1">
                    <div class="uk-inline uk-width-1-1">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input name="search" class="uk-input uk-border-pill" type="text" placeholder="Search vault" aria-label="Input" autocomplete="off">
                    </div>
                </div>
            </div>

            <div class="uk-navbar-right uk-margin-small">
                <ul class="uk-navbar-nav">
                    <li>
                        <img style="cursor: pointer;" alt="gravatar" class="uk-border-circle" src={gravatar_url} width="40" height="40">
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
        width: 250px;
    }
</style>
<script>
    const whoami = JSON.parse(localStorage.getItem("whoami"));
</script>

<nav class="uk-navbar-container">
    <div class="uk-container uk-container-xlarge">
        <div uk-navbar="align: center; mode: click;">

            <div class="uk-navbar-center" style="width: 50%;">
                <div class="uk-navbar-item uk-width-1-1">
                    <div class="uk-inline uk-width-1-1">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input class="uk-input uk-border-pill" type="text" placeholder="Search vault" aria-label="Input">
                    </div>
                </div>
            </div>

            <div class="uk-navbar-right uk-margin-small">
                <ul class="uk-navbar-nav" style="cursor:pointer;">
                    <li>
                        <div class="uk-grid-medium uk-flex-middle" uk-grid>
                            <div>
                                <img class="uk-border-circle" src="https://getuikit.com/docs/images/avatar.jpg" width="50" height="50">
                            </div>
                            <div>
                                <h5 class="uk-margin-remove">{whoami.identity}</h5>
                                <p class="uk-margin-remove">MellonPass</p>
                            </div>
                            <span uk-drop-parent-icon></span>
                        </div>
                        <div class="uk-navbar-dropdown">
                            <ul class="uk-nav uk-navbar-dropdown-nav">
                                <li><a href><span class="uk-margin-small-right" uk-icon="sign-out"></span>Logout</a></li>
                                <li><a href><span class="uk-margin-small-right" uk-icon="lock"></span>Lock</a></li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>

<?php
    if($_SESSION['tipo_sbp'] != "Administrador"){
        echo $lc->forzar_cierre_sesion_controlador();
    }
?>

<br>
<div class="container-fluid">
    <ul class="breadcrumb breadcrumb-tabs">
        <li>
            <a href="<?php echo SERVERURL;?>admin/" class="btn btn-info">
                <i class="zmdi zmdi-plus"></i> &nbsp; NUEVO ADMINISTRADOR
            </a>
        </li>
        <li>
            <a href="<?php echo SERVERURL;?>adminlist/" class="btn btn-success">
                <i class="zmdi zmdi-format-list-bulleted"></i> &nbsp; LISTA DE ADMINISTRADORES
            </a>
        </li>
        <li>
            <a href="<?php echo SERVERURL;?>adminsearch/" class="btn btn-primary">
                <i class="zmdi zmdi-search"></i> &nbsp; BUSCAR ADMINISTRADOR
            </a>
        </li>
    </ul>
</div>

<?php
    require_once "./controladores/administradorControlador.php";
    $insAdmin = new administradorControlador();
?>

<!-- Panel listado de administradores -->
<div class="container-fluid">
    <div class="panel panel-success">
        <div class="panel-heading">
            <h3 class="panel-title"><i class="zmdi zmdi-format-list-bulleted"></i> &nbsp; LISTA DE ADMINISTRADORES</h3>
        </div>
        <div class="panel-body">
            <?php
                $pagina = explode("/", $_GET['views']);
                echo $insAdmin->paginador_administrador_controlador($pagina[1], 10, $_SESSION['privilegio_sbp'], $_SESSION['codigo_cuenta_sbp'], "");
            ?>
        </div>
    </div>
</div>
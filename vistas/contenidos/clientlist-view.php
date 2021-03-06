<br>
<div class="container-fluid">
    <ul class="breadcrumb breadcrumb-tabs">
        <li>
            <a href="<?php echo SERVERURL?>client/" class="btn btn-info">
                <i class="zmdi zmdi-plus"></i> &nbsp; NUEVO CLIENTE
            </a>
        </li>
        <li>
            <a href="<?php echo SERVERURL?>clientlist/" class="btn btn-success">
                <i class="zmdi zmdi-format-list-bulleted"></i> &nbsp; LISTA DE CLIENTES
            </a>
        </li>
        <li>
            <a href="<?php echo SERVERURL?>clientsearch/" class="btn btn-primary">
                <i class="zmdi zmdi-search"></i> &nbsp; BUSCAR CLIENTE
            </a>
        </li>
    </ul>
</div>

<?php
    require_once "./controladores/clienteControlador.php";
    $insCliente = new clienteControlador();
?>

<!-- Panel listado de clientes -->
<div class="container-fluid">
    <div class="panel panel-success">
        <div class="panel-heading">
            <h3 class="panel-title"><i class="zmdi zmdi-format-list-bulleted"></i> &nbsp; LISTA DE CLIENTES</h3>
        </div>
        <div class="panel-body">
            <?php
                $pagina = explode("/", $_GET['views']);
                echo $insCliente->paginador_cliente_controlador($pagina[1], 10, $_SESSION['privilegio_sbp'], "");
            ?>
        </div>
    </div>
</div>
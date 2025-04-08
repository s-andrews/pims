$( document ).ready(function() {

    $("#checkowner").click(checkowner);

})

function checkowner() {

    let username = $("#project_owner").val()

    if (!username) {
        return
    }

    $("#checkowner").text("Checking")
    $("#checkedname").text("")


    $.ajax(
        {
            url: "checkowner",
            method: "POST",
            data: {
                username: username
            },
            success: function(username) {
                $("#checkedname").text(username)
                $("#checkowner").text("Found!")
                $("#checkowner").removeClass("btn-primary")
                $("#checkowner").addClass("btn-success")
            },
            error: function(message) {
                $("#checkowner").text("Not found")
                $("#checkowner").removeClass("btn-primary")
                $("#checkowner").removeClass("btn-success")
                $("#checkowner").addClass("btn-danger")
                setTimeout(function(){
                    $("#checkowner").text("Check user")
                    $("#checkowner").removeClass("btn-danger")
                    $("#checkowner").addClass("btn-primary")
                    },2000)
            }
        }
    )
}
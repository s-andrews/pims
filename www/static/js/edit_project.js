$( document ).ready(function() {

    $("#checkowner").click(checkowner);
    $("#saveproject").click(saveproject);

})

function saveproject() {
    // Check we've got enough information to save the project

    // Do we have a project ID. It's the end of the URL if it's
    // there.  If it's just editproject then there's no id and
    // we're making a new project
    let project_id = location.pathname.split("/").pop()
    if (project_id == "editproject") {
        project_id = ""
    }

    //  Is there an owner
    let project_owner = ""
    if ($("#checkedname").text()) {
        project_owner = $("#checkedname").data("username")
    }
    else {
        // This is an error if this is a new project
        if (!project_id) {
            $("#errormessage").text("You need to set the project owner")
            $("#editprojecterror").modal("show")
            return
        }
    }

    let project_title = $("#project_title").val()

    // Error if not
    if (! project_title) {
        $("#errormessage").text("You need to supply a project title")
        $("#editprojecterror").modal("show")
        return
    }

    let project_description = $("#project_description").val()

    // Error if not
    if (! project_description) {
        $("#errormessage").text("You need to supply a project description")
        $("#editprojecterror").modal("show")
        return
    }

    // We can go ahead and edit the project.
    $("#saveproject").prop("disabled",true)
    $.ajax(
        {
            url: "/saveproject",
            method: "POST",
            data: {
                project_id: project_id,
                owner: project_owner,
                title: project_title,
                description: project_description
            },
            success: function(project_id) {
                window.location.href = "/project/"+project_id
            },
            error: function(message) {
                $("#errormessage").text("Failed to save project")
                $("#editprojecterror").modal("show")
                $("#saveproject").prop("disabled",false)
                return        
            }
        }
    )


}

function checkowner() {

    let username = $("#project_owner").val()

    if (!username) {
        return
    }

    $("#checkowner").text("Checking")
    $("#checkedname").text("")
    $("#checkedname").data("username",username)

    $.ajax(
        {
            url: "checkowner",
            method: "POST",
            data: {
                username: username
            },
            success: function(userstring) {
                $("#checkedname").text(userstring)
                $("#checkowner").text("Found!")
                $("#checkowner").removeClass("btn-primary")
                $("#checkowner").addClass("btn-success")
            },
            error: function(message) {
                $("#checkedname").data("username","")
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
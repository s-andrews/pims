$( document ).ready(function() {

    $("#add_sample").click(show_new_sample)
    $("#save_sample").click(save_sample)

})


function save_sample() {
    // We need the project id
    let project_id = location.pathname.split("/").pop()
    if (project_id == "project") {
        project_id = ""
    }

    // We need to determine if this is a new sample or editing an existing one
    let sample_id = ""

    let something_failed = false

    // We need to collect the standard features
    let name = $("#sample_name").val()
    if (name) {
         $("#sample_name").css("border-color","rgb(222, 226, 230")
    }
    else {
        $("#sample_name").css("border-color","red")
        something_failed = true
    }

    let state = $("#sample_state").val()
    if (state) {
         $("#sample_state").css("border-color","rgb(222, 226, 230")
    }
    else {
        $("#sample_state").css("border-color","red")
        something_failed = true
    }

    let organism = $("#organism").val()
    if (organism) {
         $("#organism").css("border-color","rgb(222, 226, 230")
    }
    else {
        $("#organism").css("border-color","red")
        something_failed = true
    }
    
    // We then need the values for the tags
    let tag_values = []
    $(".tag_value_input").each(function(){
        let value = $(this).val()
        if (value) {
            $(this).css("border-color","rgb(222, 226, 230")
            tag_values.push(value)
        }
        else {
            $(this).css("border-color","red")
            something_failed = true
        }
    })

    if (something_failed) {
        return
    }

    // Now we can add/edit this
    $("#save_sample").prop("disabled",true)
    $.ajax(
        {
            url: "/savesample",
            method: "POST",
            data: {
                project_id: project_id,
                sample_id: sample_id,
                name: name,
                state: state,
                organism: organism,
                tags: tag_values
            },
            success: function(project_id) {
                window.location.reload()
            },
            error: function(message) {
                $("#errormessage").text("Failed to save project")
                $("#editprojecterror").modal("show")
                $("#save_sample").prop("disabled",false)
                return        
            }
        }
    )


}


function show_new_sample() {
    // Blank the contents
    $("#editsamplediv").modal("show")
}
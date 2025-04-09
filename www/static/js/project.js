$( document ).ready(function() {

    $("#add_sample").click(show_new_sample)
    $("#save_sample").click(save_sample)
    $(".deletesample").click(delete_sample)

})


function delete_sample() {
    //  We need to get the project id and sample id from 
    // the start of the table row in which the delete 
    // button was found.

    let ids = $(this).parent().parent().find("td").first().text()
    let project_sample = ids.split("-")

    $(this).prop("disabled",true)

    let row_to_delete = $(this).parent().parent()
    $.ajax(
        {
            url: "/deletesample",
            method: "POST",
            data: {
                project_id: project_sample[0],
                sample_id: project_sample[1]
            },
            success: function() {
                row_to_delete.remove()
            },
            error: function(message) {
                $(this).prop("disabled",false)
                console.log("Failed to delete sample")
                return        
            }
        }
    )



}


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